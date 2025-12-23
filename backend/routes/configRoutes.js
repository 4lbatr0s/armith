/**
 * Configuration Routes
 * Routes for managing KYC configuration
 */

import { Router } from 'express';
import {
    getConfig,
    updateConfig,
    applyPreset,
    getPresets
} from '../controllers/configController.js';

const router = Router();

// Get user's configuration (creates default if not exists)
router.get('/', getConfig);

// Get available presets
router.get('/presets', getPresets);

// Update configuration (partial update)
router.patch('/', updateConfig);

// Apply a preset
router.post('/preset', applyPreset);

export default router;
