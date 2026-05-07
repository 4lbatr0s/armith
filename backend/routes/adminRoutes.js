import express from 'express';
import { requireAuth } from '@clerk/express';
import {
  getVerifications,
  getStats,
  getWebhookDeliveries,
  deleteOwnedVerification,
  replayTerminalWebhook,
  listManualReviewQueue,
  enqueueManualReview,
  resolveManualReview,
  mintVerificationCaptureSessionHandler,
  getKeyedErrorSummary,
  getSettings,
  updateSettings,
  resetSettings
} from '../controllers/adminController.js';
import {
  getApiKeys,
  createApiKeyHandler,
  patchApiKeyAllowlistHandler,
  revokeApiKeyHandler,
  putAccountApiIpAllowlist
} from '../controllers/apiKeyController.js';

const router = express.Router();

// All admin routes require authentication
router.use(requireAuth());

// Get all verifications (admin endpoint)
router.get('/verifications', getVerifications);
router.delete('/verifications/:profileId', deleteOwnedVerification);

// Get verification stats
router.get('/stats', getStats);

router.get('/webhook-deliveries', getWebhookDeliveries);

router.post('/webhooks/replay/:profileId', replayTerminalWebhook);

router.get('/manual-reviews', listManualReviewQueue);
router.post('/manual-reviews/:profileId/enqueue', enqueueManualReview);
router.post('/manual-reviews/:profileId/resolve', resolveManualReview);

router.post('/verifications/:profileId/capture-session', mintVerificationCaptureSessionHandler);

router.get('/errors/summary', getKeyedErrorSummary);

// Settings endpoints
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/settings/reset', resetSettings);

// API key management
router.get('/api-keys', getApiKeys);
router.post('/api-keys', createApiKeyHandler);
router.put('/account-api-ip-allowlist', putAccountApiIpAllowlist);
router.patch('/api-keys/:id', patchApiKeyAllowlistHandler);
router.delete('/api-keys/:id', revokeApiKeyHandler);

export default router; 