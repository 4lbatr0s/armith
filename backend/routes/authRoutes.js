import express from 'express';
import { protectRoute, getUser } from '@kinde-oss/kinde-node-express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

/**
 * Handle OAuth callback - create or update user profile
 * POST /api/auth/callback
 */
router.post('/callback', protectRoute, getUser, async (req, res) => {
  try {
    
    // Extract user data from OAuth provider (Kinde in this case)
    const userData = {
      userId: req.user.id,
      email: req.user.email,
      emailVerified: req.user.email_verified || false,
      provider: 'kinde',
      lastLoginAt: new Date(),
      providerData: {
        given_name: req.user.given_name,
        family_name: req.user.family_name,
        picture: req.user.picture,
        // Store any other provider-specific data
      }
    };

    // Upsert user profile (create if doesn't exist, update if exists)
    const profile = await prisma.profile.upsert({
      where: { userId: userData.userId },
      update: {
        email: userData.email,
        emailVerified: userData.emailVerified,
        lastLoginAt: userData.lastLoginAt,
        providerData: userData.providerData,
        updatedAt: new Date()
      },
      create: {
        userId: userData.userId,
        email: userData.email,
        emailVerified: userData.emailVerified,
        provider: userData.provider,
        lastLoginAt: userData.lastLoginAt,
        providerData: userData.providerData
      }
    });

    res.json({
      success: true,
      data: {
        profile,
        message: 'User profile synchronized successfully'
      }
    });
  } catch (error) {
    console.error('Callback processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process authentication callback'
    });
  }
});

/**
 * Get current user profile from session
 * GET /api/auth/profile
 */
router.get('/profile', protectRoute, getUser, async (req, res) => {
  try {
    
    // Get user profile from database
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        profile,
        sessionUser: {
          id: req.user.id,
          email: req.user.email,
          given_name: req.user.given_name,
          family_name: req.user.family_name,
          picture: req.user.picture
        }
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

/**
 * Check authentication status
 * GET /api/auth/status
 */
router.get('/status', protectRoute, (req, res) => {
  res.json({
    success: true,
    data: {
      authenticated: true,
      message: 'User is authenticated'
    }
  });
});

/**
 * Login route - redirects to Kinde
 * GET /api/auth/login
 */
router.get('/login', (req, res) => {
  res.redirect('/login');
});

/**
 * Logout route - redirects to Kinde logout
 * GET /api/auth/logout
 */
router.get('/logout', (req, res) => {
  res.redirect('/logout');
});

export default router;
