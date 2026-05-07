import storageService from '../storageService.js';
import logger from '../../lib/logger.js';

function collectUniqueKeysFromUrls(urls) {
    const keys = new Set();
    for (const u of urls) {
        if (!u || typeof u !== 'string') continue;
        const key = storageService.extractKeyFromUrl(u);
        if (key) keys.add(key);
    }
    return [...keys];
}

/**
 * Best-effort R2/S3 deletes for profile + latest validation URLs.
 * Controlled by ADMIN_DELETE_PURGE_OBJECTS=1.
 */
export async function purgeVerificationStorageForProfile(profile, extras = []) {
    if (process.env.ADMIN_DELETE_PURGE_OBJECTS !== '1') {
        return { attempted: false, deleted: 0 };
    }
    if (!storageService.isAvailable()) {
        return { attempted: false, deleted: 0, reason: 'storage_unconfigured' };
    }

    const fromProfile = collectUniqueKeysFromUrls([
        profile?.idFrontImageUrl,
        profile?.idBackImageUrl,
        profile?.selfieImageUrl
    ]);
    const fromExtras = collectUniqueKeysFromUrls(extras);
    const keys = [...new Set([...fromProfile, ...fromExtras])];

    let deleted = 0;
    for (const key of keys) {
        try {
            await storageService.deleteFile(key);
            deleted += 1;
        } catch (e) {
            logger.warn({ err: e.message, key }, 'purgeVerificationStorageForProfile key delete skipped');
        }
    }
    return { attempted: true, deleted, keys: keys.length };
}
