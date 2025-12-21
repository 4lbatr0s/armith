import express from 'express';
import { requireAuth } from '@clerk/express';
import { 
  getVerifications, 
  getStats, 
  getSettings, 
  updateSettings, 
  resetSettings 
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication
router.use(requireAuth());

// Get all verifications (admin endpoint)
router.get('/verifications', getVerifications);

// Get verification stats
router.get('/stats', getStats);

// Settings endpoints
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/settings/reset', resetSettings);

export default router; 