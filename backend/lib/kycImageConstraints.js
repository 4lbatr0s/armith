/** Shared limits for presign + pre-verify HEAD checks */

const TEN_MB = 10 * 1024 * 1024;

export function getMaxImageBytes() {
    const n = Number(process.env.KYC_MAX_IMAGE_BYTES);
    return Number.isFinite(n) && n > 0 ? n : TEN_MB;
}

export function getAllowedMimeTypes() {
    const raw = process.env.KYC_ALLOWED_IMAGE_MIME;
    if (raw && String(raw).trim()) {
        return String(raw)
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
    }
    return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
}

export function normalizeClientMime(fileType) {
    if (fileType == null || fileType === '') return 'image/jpeg';
    const s = String(fileType).trim().toLowerCase();
    if (s === 'image/jpg') return 'image/jpeg';
    return s;
}

/** @returns {{ ok: true, mime: string } | { ok: false, errorKey: 'UNSUPPORTED_IMAGE_TYPE' }} */
export function validatePresignMime(fileType) {
    const mime = normalizeClientMime(fileType);
    const allowed = new Set(getAllowedMimeTypes());
    if (allowed.has(mime)) return { ok: true, mime };
    return { ok: false, errorKey: 'UNSUPPORTED_IMAGE_TYPE' };
}

/** Min edge length in pixels (`0` = disabled). */
export function getMinImageDimensionPx() {
    const n = Number(process.env.KYC_MIN_IMAGE_DIMENSION);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Minimum width×height megapixels (`0` = disabled). Example: `0.2` forces ~400×500 at least equivalent. */
export function getMinImageMegapixels() {
    const n = Number(process.env.KYC_MIN_MEGAPIXELS);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * @param {{ w: number, h: number } | null} dims
 * @returns {{ ok: true } | { ok: false, reasonKey: string, details?: object }}
 */
export function evaluateImageResolutionPolicy(dims, minPx, minMegapixels) {
    const needPx = minPx > 0;
    const needMp = minMegapixels > 0;
    if (!needPx && !needMp) return { ok: true };

    if (!dims || !Number.isFinite(dims.w) || !Number.isFinite(dims.h) || dims.w < 1 || dims.h < 1) {
        return { ok: false, reasonKey: 'unreadable', details: dims ?? null };
    }
    const mp = (dims.w * dims.h) / 1_000_000;
    if (needPx && (dims.w < minPx || dims.h < minPx)) {
        return { ok: false, reasonKey: 'below_px', details: { w: dims.w, h: dims.h, minPx } };
    }
    if (needMp && mp < minMegapixels) {
        return { ok: false, reasonKey: 'below_mp', details: { w: dims.w, h: dims.h, mp, minMegapixels } };
    }
    return { ok: true };
}

export function getImageConstraintsForApi() {
    const minPx = getMinImageDimensionPx();
    const minMp = getMinImageMegapixels();
    return {
        maxBytes: getMaxImageBytes(),
        allowedContentTypes: [...new Set(getAllowedMimeTypes())],
        ...(minPx > 0 ? { minImageDimensionPx: minPx } : {}),
        ...(minMp > 0 ? { minMegapixels: minMp } : {})
    };
}

export function isContentTypeAllowedForObject(headContentType) {
    if (!headContentType || typeof headContentType !== 'string') return true;
    const ct = headContentType.split(';')[0].trim().toLowerCase();
    const allowed = new Set(getAllowedMimeTypes());
    return allowed.has(ct);
}
