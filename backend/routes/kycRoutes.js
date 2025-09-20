import express from 'express';
import { 
  getSupportedCountries,
  generateUploadUrl,
  generateSecureDownloadUrlEndpoint,
  localUpload,
  serveFile,
  verifyId,
  verifySelfie,
  getUserStatus,
  getLLMStatus
} from '../controllers/kycController.js';

const router = express.Router();

// Get supported countries
router.get('/countries', getSupportedCountries);

// Get LLM service status
router.get('/llm-status', getLLMStatus);

// Generate presigned upload URL
router.post('/upload-url', generateUploadUrl);

// Generate secure download URL for AI processing
router.post('/secure-download-url', generateSecureDownloadUrlEndpoint);

// Local file upload (for local storage mode)
router.post('/local-upload', localUpload);

// Serve local files
router.get('/files/:fileName', serveFile);

// ID verification
router.post('/id-check', verifyId);

// Selfie verification
router.post('/selfie-check', verifySelfie);

// Get user verification status
router.get('/status/:userId', getUserStatus);

export default router; 