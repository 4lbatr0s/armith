import { KycConfiguration } from '../../models/index.js';
import { createDefaultConfig } from '../../kyc/defaults.js';
import logger from '../../lib/logger.js';
import { resolveKycConfig } from '../../thresholds/resolve.js';

export async function getOrCreateUserKycDocument(userId) {
    if (!userId) return null;
    try {
        let config = await KycConfiguration.findOne({ userId, environment: 'production' });
        if (!config) {
            config = await KycConfiguration.create(createDefaultConfig(userId));
        }
        return config;
    } catch (error) {
        logger.error({ error: error.message, userId }, 'Failed to get user config');
        return null;
    }
}

/** Plain object merged for LLM services + threshold resolution */
export function buildEffectiveKycPlain({ userDoc, countryCodeOverride, anonymousUserLabel = 'system' }) {
    const cc = String(countryCodeOverride || userDoc?.countryCode || 'TR').toUpperCase();
    const base = userDoc?.toObject?.() ?? createDefaultConfig(anonymousUserLabel, cc);
    const effectivePlain = { ...base, countryCode: cc };
    return { effectivePlain, resolved: resolveKycConfig(effectivePlain) };
}
