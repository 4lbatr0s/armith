import express from 'express';
import { getAuth } from '@clerk/express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { User } from '../models/index.js';

const router = express.Router();

/**
 * GET /auth/profile
 * Get current user profile
 */
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const auth = getAuth(req);
    const clerkId = auth.userId;

    let user = await User.findOne({ clerkId });

    if (!user) {
      user = await User.create({ clerkId, lastLoginAt: new Date() });
    } else {
      user.lastLoginAt = new Date();
      await user.save();
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

/**
 * GET /auth/status
 * Check authentication status
 */
router.get('/status', (req, res) => {
  try {
    const auth = getAuth(req);
    res.json({
      success: true,
      data: { authenticated: !!auth.userId, userId: auth.userId }
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ success: false, error: 'Failed to check status' });
  }
});

export default router;
