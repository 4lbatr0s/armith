import storageService from '../storageService.js';
import { ERRORS } from '../../kyc/config.js';

/**
 * Server-side checks after the client uploaded to presigned URLs and before calling the LLM.
 * Validates URL shape; when R2 is configured, confirms objects exist (HEAD).
 */
export async function assertImagesReadyForLlm(imageUrls) {
    for (const url of imageUrls) {
        if (!url || typeof url !== 'string' || !storageService.isValidImageUrl(url)) {
            return { ok: false, error: ERRORS.INVALID_IMAGE_URL };
        }
        if (!storageService.isAvailable()) {
            continue;
        }
        const key = storageService.extractKeyFromUrl(url);
        if (!key) {
            return { ok: false, error: ERRORS.INVALID_IMAGE_URL };
        }
        try {
            const exists = await storageService.fileExists(key);
            if (!exists) {
                return { ok: false, error: ERRORS.INVALID_IMAGE_URL };
            }
        } catch {
            return { ok: false, error: ERRORS.INTERNAL_ERROR };
        }
    }
    return { ok: true };
}
