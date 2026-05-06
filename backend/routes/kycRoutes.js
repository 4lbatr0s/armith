import express from 'express';
import { 
  getSupportedCountries,
  generateUploadUrl,
  generateSecureDownloadUrlEndpoint,
  verifyId,
  verifySelfie,
  getUserStatus,
  getLLMStatus
} from '../controllers/kycController.js';
import { authenticateApiKeyOrUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/countries', getSupportedCountries);
router.get('/llm-status', getLLMStatus);

// Protected routes
router.post('/upload-url', authenticateApiKeyOrUser, generateUploadUrl);
router.post('/secure-download-url', authenticateApiKeyOrUser, generateSecureDownloadUrlEndpoint);
router.post('/id-check', authenticateApiKeyOrUser, verifyId);
router.post('/selfie-check', authenticateApiKeyOrUser, verifySelfie);
router.get('/status/:profileId', authenticateApiKeyOrUser, getUserStatus);

export default router; 
