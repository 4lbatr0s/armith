import storageService from '../storageService.js';
import { ERRORS } from '../../kyc/config.js';
import {
    getMaxImageBytes,
    getMinImageDimensionPx,
    getMinImageMegapixels,
    evaluateImageResolutionPolicy,
    isContentTypeAllowedForObject
} from '../../lib/kycImageConstraints.js';
import { sniffImageDimensions } from '../../lib/imageProbe.js';

const DEFAULT_HEAD_MS = 8000;

function raceHeadWithTimeout(fn, ms) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            reject(Object.assign(new Error('object_head_timeout'), { name: 'HeadTimeout' }));
        }, ms);
        fn().then(
            (v) => {
                clearTimeout(t);
                resolve(v);
            },
            (e) => {
                clearTimeout(t);
                reject(e);
            }
        );
    });
}

/**
 * Server-side checks after the client uploaded to presigned URLs and before calling the LLM.
 * Validates URL shape; when R2 is configured, confirms objects exist (HEAD).
 */
export async function assertImagesReadyForLlm(imageUrls) {
    const headMs = Number(process.env.R2_HEAD_TIMEOUT_MS ?? DEFAULT_HEAD_MS);

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
            const head = await raceHeadWithTimeout(() => storageService.peekObjectHead(key), headMs);
            if (!head.exists) {
                return { ok: false, error: ERRORS.INVALID_IMAGE_URL };
            }
            const maxB = getMaxImageBytes();
            if (typeof head.contentLength === 'number' && head.contentLength > maxB) {
                return { ok: false, error: ERRORS.IMAGE_TOO_LARGE };
            }
            if (!isContentTypeAllowedForObject(head.contentType)) {
                return { ok: false, error: ERRORS.UNSUPPORTED_IMAGE_TYPE };
            }

            const minPx = getMinImageDimensionPx();
            const minMp = getMinImageMegapixels();
            if (minPx > 0 || minMp > 0) {
                let sniffBuf;
                try {
                    sniffBuf = await raceHeadWithTimeout(
                        () => storageService.peekObjectRange(key, 65536),
                        headMs
                    );
                } catch {
                    return { ok: false, error: ERRORS.INTERNAL_ERROR };
                }
                const dims = sniffImageDimensions(sniffBuf);
                const verdict = evaluateImageResolutionPolicy(dims, minPx, minMp);
                if (!verdict.ok) {
                    return { ok: false, error: ERRORS.IMAGE_RESOLUTION_TOO_LOW };
                }
            }
        } catch (err) {
            if (err && err.name === 'HeadTimeout') {
                return { ok: false, error: ERRORS.INTERNAL_ERROR };
            }
            return { ok: false, error: ERRORS.INTERNAL_ERROR };
        }
    }
    return { ok: true };
}
