import { KycConfiguration } from '../../models/index.js';
import { createDefaultConfig } from '../../kyc/defaults.js';
import logger from '../../lib/logger.js';
import { resolveKycConfig } from '../../thresholds/resolve.js';

/** Loads persisted `KycConfiguration` for the Clerk user (or creates defaults). Not a Profile/User document. */
export async function getOrCreateUserKycConfig(userId) {
    if (!userId) {
        return null;
    }
    try {
        let config = await KycConfiguration.findOne({ userId, environment: 'production' });

        if (!config) {
            config = await KycConfiguration.create(createDefaultConfig(userId));
        }

        return config;
    } catch (error) {
        logger.error({ error: error.message, userId }, 'Failed to get or create KYC configuration');
        return null;
    }
}

/**
 * @param {{ toObject?: () => object, countryCode?: string } | null | undefined} kycConfigDoc - Mongoose KycConfiguration doc, if any
 */
export function buildEffectiveKycPlain({ kycConfigDoc, countryCodeOverride, anonymousUserLabel = 'system' }) {
    const cc = String(countryCodeOverride || kycConfigDoc?.countryCode || 'TR').toUpperCase();
    const base = kycConfigDoc?.toObject?.() ?? createDefaultConfig(anonymousUserLabel, cc);
    const effectivePlain = { ...base, countryCode: cc };
    return { effectivePlain, resolved: resolveKycConfig(effectivePlain) };
}
