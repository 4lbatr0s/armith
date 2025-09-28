import express from 'express';
import { protectRoute, getUser } from '@kinde-oss/kinde-node-express';
import { 
  getSupportedCountries,
  generateUploadUrl,
  generateSecureDownloadUrlEndpoint,
  verifyId,
  verifySelfie,
  getUserStatus,
  getLLMStatus
} from '../controllers/kycController.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/countries', getSupportedCountries);
router.get('/llm-status', getLLMStatus);

// Protected routes (authentication required)
router.post('/upload-url', protectRoute, getUser, generateUploadUrl);
router.post('/secure-download-url', protectRoute, getUser, generateSecureDownloadUrlEndpoint);
router.post('/id-check', protectRoute, getUser, verifyId);
router.post('/selfie-check', protectRoute, getUser, verifySelfie);
router.get('/status/:userId', protectRoute, getUser, getUserStatus);

export default router; 