import express from 'express';
import { getVerifications } from '../controllers/adminController.js';

const router = express.Router();

// Get all verifications (admin endpoint)
router.get('/verifications', getVerifications);

export default router; 