import rateLimit from 'express-rate-limit';

const windowMs = 15 * 60 * 1000;
const maxDefault = 1000;

/** Stricter limit for requests authenticated with an API key only. */
export const apiKeyKycRateLimiter = rateLimit({
    windowMs,
    max: Number(process.env.RATE_LIMIT_API_KEY_MAX ?? maxDefault),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' || req.authContext?.mode !== 'apiKey',
    keyGenerator: (req) =>
        req.authContext?.mode === 'apiKey' && req.authContext.apiKeyId
            ? `ak:${req.authContext.apiKeyId}`
            : 'na',
    message: { success: false, error: 'API key rate limit exceeded' }
});
