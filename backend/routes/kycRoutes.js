import express from 'express';
import { requireAuth } from '@clerk/express';
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

// Public routes
router.get('/countries', getSupportedCountries);
router.get('/llm-status', getLLMStatus);

// Protected routes
router.post('/upload-url', requireAuth(), generateUploadUrl);
router.post('/secure-download-url', requireAuth(), generateSecureDownloadUrlEndpoint);
router.post('/id-check', requireAuth(), verifyId);
router.post('/selfie-check', requireAuth(), verifySelfie);
router.get('/status/:userId', requireAuth(), getUserStatus);

export default router;
