import express from 'express';
import { healthCheck } from '../controllers/healthController.js';

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

export default router; 