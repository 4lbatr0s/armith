/**
 * Configuration Controller
 * Handles KYC configuration CRUD operations
 */

import { KycConfiguration } from '../models/index.js';
import { createDefaultConfig, createFromPreset, PRESETS } from '../kyc/defaults.js';

/**
 * Get user's KYC configuration (creates default if not exists)
 */
export async function getConfig(req, res) {
    try {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        let config = await KycConfiguration.findOne({ userId, environment: 'production' });

        if (!config) {
            const defaultConfig = createDefaultConfig(userId);
            config = await KycConfiguration.create(defaultConfig);
        }

        res.json({ success: true, config });
    } catch (error) {
        console.error('Get config error:', error);
        res.status(500).json({ error: 'Failed to get configuration' });
    }
}

/**
 * Update user's KYC configuration (partial update)
 */
export async function updateConfig(req, res) {
    try {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const updates = req.body;
        const config = await KycConfiguration.findOne({ userId, environment: 'production' });

        if (!config) {
            return res.status(404).json({ error: 'Configuration not found' });
        }

        // Optimistic locking check
        if (updates.version && updates.version !== config.version) {
            return res.status(409).json({ error: 'Config modified. Refresh and try again.' });
        }

        // Apply updates
        applyUpdates(config, updates);
        config.version += 1;
        await config.save();

        res.json({ success: true, config });
    } catch (error) {
        console.error('Update config error:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
}

/**
 * Apply a preset configuration
 */
export async function applyPreset(req, res) {
    try {
        const userId = req.auth?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { preset } = req.body;
        if (!preset || !PRESETS[preset]) {
            return res.status(400).json({ error: `Invalid preset: ${Object.keys(PRESETS).join(', ')}` });
        }

        const presetConfig = createFromPreset(preset, userId);
        const config = await KycConfiguration.findOneAndUpdate(
            { userId, environment: 'production' },
            presetConfig,
            { upsert: true, new: true }
        );

        res.json({ success: true, config, appliedPreset: preset });
    } catch (error) {
        console.error('Apply preset error:', error);
        res.status(500).json({ error: 'Failed to apply preset' });
    }
}

/**
 * Get available presets
 */
export async function getPresets(req, res) {
    const presetList = Object.entries(PRESETS).map(([key, value]) => ({
        key,
        name: value.name,
        description: value.description,
    }));
    res.json({ success: true, presets: presetList });
}

// ============================================================================
// HELPERS
// ============================================================================

function applyUpdates(config, updates) {
    if (updates.name) config.name = updates.name;
    if (updates.description !== undefined) config.description = updates.description;
    if (updates.isActive !== undefined) config.isActive = updates.isActive;

    // Merge nested objects
    if (updates.verificationSteps) {
        Object.assign(config.verificationSteps, updates.verificationSteps);
    }
    if (updates.idCardThresholds) {
        Object.assign(config.idCardThresholds, updates.idCardThresholds);
    }
    if (updates.selfieThresholds) {
        Object.assign(config.selfieThresholds, updates.selfieThresholds);
    }
    if (updates.validationRules) {
        Object.assign(config.validationRules, updates.validationRules);
    }
    if (updates.customThresholds) {
        Object.assign(config.customThresholds, updates.customThresholds);
    }
}
