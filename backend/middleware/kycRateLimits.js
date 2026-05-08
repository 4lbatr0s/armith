import rateLimit from 'express-rate-limit';
import { getClientIp } from '../lib/clientIp.js';
import {
  KYC_BURST_WINDOW_MS,
  resolveKycBurstLimitForClerkId,
  resolveKycPerIpLimit
} from '../services/kycRateLimitPolicy.js';

/**
 * Per-tenant burst cap on authenticated KYC routes.
 * Key: API key id (key material) or dashboard/capture session user id — same numeric limit from plan + User.limitsOverride.
 */
export const kycBurstRateLimiter = rateLimit({
  windowMs: KYC_BURST_WINDOW_MS,
  standardHeaders: true,
  legacyHeaders: false,
  identifier: 'kyc-tenant-burst',
  skip: (req) => req.method === 'OPTIONS' || !req.authContext?.userId,
  keyGenerator: (req) => {
    const mode = req.authContext?.mode;
    const uid = req.authContext.userId;
    if (mode === 'apiKey' && req.authContext.apiKeyId) {
      return `kyc-burst:ak:${req.authContext.apiKeyId}`;
    }
    return `kyc-burst:tu:${uid}`;
  },
  limit: async (req) => resolveKycBurstLimitForClerkId(req.authContext.userId),
  message: {
    success: false,
    error: 'KYC rate limit exceeded for this account or API key.',
    code: 'RATE_LIMIT_KYC_BURST'
  }
});

/**
 * Shared per-client-IP ceiling for KYC routes (mitigates many keys behind one NAT).
 * Optional per-IP overrides: env `RATE_LIMIT_KYC_IP_OVERRIDES` JSON map.
 */
export const kycClientIpRateLimiter = rateLimit({
  windowMs: KYC_BURST_WINDOW_MS,
  standardHeaders: true,
  legacyHeaders: false,
  identifier: 'kyc-client-ip',
  skip: (req) => req.method === 'OPTIONS' || !req.authContext?.userId,
  keyGenerator: (req) => {
    const ip = getClientIp(req) || 'unknown';
    return `kyc-ip:${ip}`;
  },
  limit: async (req) => resolveKycPerIpLimit(getClientIp(req)),
  message: {
    success: false,
    error: 'Too many KYC requests from this network address.',
    code: 'RATE_LIMIT_KYC_IP'
  }
});
