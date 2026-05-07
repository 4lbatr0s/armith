import { createHmac, timingSafeEqual } from 'crypto';

const TTL_DEFAULT_SEC = Math.max(
    60,
    Number(process.env.VERIFICATION_CAPTURE_TTL_SECONDS || 900) || 900
);
const TTL_MAX_CAP = Math.max(
    TTL_DEFAULT_SEC,
    Math.min(Number(process.env.VERIFICATION_CAPTURE_TTL_MAX_SECONDS || 86400) || 86400, 604800)
);

function b64(json) {
    return Buffer.from(JSON.stringify(json), 'utf8').toString('base64url');
}

function unb64(s) {
    try {
        return JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
}

function sign(secret, bodyB64) {
    const h = createHmac('sha256', secret);
    h.update(bodyB64);
    return h.digest('base64url');
}

/**
 * Bearer token `{bodyB64}.{sig}` — tenant-bound read access to **`GET /kyc/status/:profileId`** and **`GET /kyc/sessions/:id`**.
 */
export function mintCaptureSessionToken({ secret, tenantUserId, profileId, ttlSeconds }) {
    if (!secret || typeof secret !== 'string' || secret.length < 16) return null;

    const now = Math.floor(Date.now() / 1000);
    const requested =
        ttlSeconds !== undefined && Number.isFinite(Number(ttlSeconds)) && Number(ttlSeconds) > 0
            ? Number(ttlSeconds)
            : TTL_DEFAULT_SEC;
    const ttl = Math.min(TTL_MAX_CAP, requested);
    const payload = {
        v: 1,
        tenant: String(tenantUserId ?? ''),
        pid: String(profileId ?? ''),
        iat: now,
        exp: now + ttl
    };

    const body = b64(payload);
    const sig = sign(secret, body);
    return { token: `${body}.${sig}`, expiresAtEpochSec: payload.exp };
}

export function verifyCaptureSessionToken({ secret, token }) {
    if (!secret || !token || typeof token !== 'string') return null;

    const lastDot = token.lastIndexOf('.');
    if (lastDot <= 0) return null;
    const body = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    const expectedSig = sign(secret, body);
    if (sig.length !== expectedSig.length) return null;

    try {
        if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    } catch {
        return null;
    }

    const payload = unb64(body);
    if (!payload || payload.v !== 1 || !payload.tenant || !payload.pid) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now || payload.iat > now + 3600) return null;

    return { tenantUserId: String(payload.tenant), profileId: String(payload.pid) };
}
