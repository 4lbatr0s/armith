import express from 'express';
import { 
  getSupportedCountries,
  generateUploadUrl,
  generateSecureDownloadUrlEndpoint,
  verifyId,
  verifySelfie,
  getUserStatus,
  getLLMStatus,
  getVerificationSession
} from '../controllers/kycController.js';
import { authenticateApiKeyOrUser } from '../middleware/authMiddleware.js';
import { optionalKycIdempotencyForPostJson } from '../middleware/kycIdempotency.js';
import { kycBurstRateLimiter, kycClientIpRateLimiter } from '../middleware/kycRateLimits.js';

const router = express.Router();
const kycAuth = [authenticateApiKeyOrUser, kycClientIpRateLimiter, kycBurstRateLimiter];

// Public routes
router.get('/countries', getSupportedCountries);
router.get('/llm-status', getLLMStatus);

// Protected routes
router.post('/upload-url', ...kycAuth, generateUploadUrl);
router.post('/secure-download-url', ...kycAuth, generateSecureDownloadUrlEndpoint);
router.post('/id-check', ...kycAuth, optionalKycIdempotencyForPostJson, verifyId);
router.post('/selfie-check', ...kycAuth, optionalKycIdempotencyForPostJson, verifySelfie);
router.get('/status/:profileId', ...kycAuth, getUserStatus);
router.get('/sessions/:id', ...kycAuth, getVerificationSession);

export default router; 
