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

/**
 * POST /auth/webhook
 * Clerk webhook endpoint
 */
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === 'user.created' || type === 'user.updated') {
      const clerkUser = data;
      await User.findOneAndUpdate(
        { clerkId: clerkUser.id },
        {
          email: clerkUser.email_addresses?.[0]?.email_address,
          emailVerified: clerkUser.email_addresses?.[0]?.verification?.status === 'verified',
          lastLoginAt: new Date(),
          providerData: {
            firstName: clerkUser.first_name,
            lastName: clerkUser.last_name,
            imageUrl: clerkUser.image_url
          }
        },
        { upsert: true, new: true }
      );
      console.log(`User ${type}:`, clerkUser.id);
    }

    if (type === 'user.deleted') {
      await User.deleteOne({ clerkId: data.id });
      console.log('User deleted:', data.id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
