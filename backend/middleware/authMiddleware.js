import mongoose from 'mongoose';
import { requireAuth, getAuth } from '@clerk/express';
import { authenticateApiKeyToken } from '../services/apiKeyService.js';
import { getClientIp } from '../lib/clientIp.js';
import { ipAllowedByRules } from '../lib/ipAllowlist.js';
import { canUsePerKeyIpAllowlist } from '../lib/planFeatures.js';
import { User } from '../models/User.js';
import { verifyCaptureSessionToken } from '../lib/captureSessionToken.js';
import { getOrCreateUsageUser } from '../services/quotaService.js';

/**
 * Middleware to require authentication
 * Uses Clerk's built-in requireAuth
 */
export const authenticateUser = requireAuth();

/**
 * Optional auth middleware - doesn't fail if no token
 */
export const optionalAuth = (req, res, next) => {
  const auth = getAuth(req);
  req.auth = auth;
    next();
};

/** Mongo `users._id` (hex) after `authenticateApiKeyOrUser` */
export const getMongoUserId = (req) => req.authContext?.mongoUserId ?? null;

/** Clerk `user_*` session id — only for Clerk-specific integration; persisted models use Mongo ids. */
export const getClerkUserId = (req) =>
  req.authContext?.clerkUserId ?? getAuth(req)?.userId ?? null;

/** Account-wide list (`User.apiAllowedCidrs`); empty ⇒ allow any IP. */
function ipAllowedForAccount(req, tenant) {
  const accountRules = Array.isArray(tenant?.apiAllowedCidrs) ? tenant.apiAllowedCidrs : [];
  if (accountRules.length === 0) return true;
  return ipAllowedByRules(getClientIp(req), accountRules);
}

function denyAccountIp(res) {
  return res.status(403).json({
    error: 'IP address not allowed for this account',
    code: 'ACCOUNT_IP_FORBIDDEN'
  });
}

const extractApiKeyToken = (req) => {
  const headerValue = req.headers['x-api-key'];
  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith('Bearer ')) return null;

  const bearerValue = authHeader.slice(7).trim();
  if (bearerValue.startsWith('ak_live_')) {
    return bearerValue;
  }

  return null;
};

export const authenticateApiKeyOrUser = async (req, res, next) => {
  try {
    const captureHeaderRaw = req.headers['x-verification-session'];
    const captureHeader =
      typeof captureHeaderRaw === 'string' && captureHeaderRaw.trim().length > 0
        ? captureHeaderRaw.trim()
        : '';
    const captureSecret =
      typeof process.env.VERIFICATION_CAPTURE_TOKEN_SECRET === 'string'
        ? process.env.VERIFICATION_CAPTURE_TOKEN_SECRET.trim()
        : '';

    if (captureHeader) {
      if (!captureSecret || captureSecret.length < 16) {
        return res.status(503).json({ error: 'Capture session tokens are not configured on this deployment' });
      }
      const claims = verifyCaptureSessionToken({ secret: captureSecret, token: captureHeader });
      if (!claims) {
        return res.status(401).json({ error: 'Invalid or expired capture session token' });
      }
      const tenantClaim = String(claims.tenantUserId ?? '');
      const captureTenant = mongoose.Types.ObjectId.isValid(tenantClaim)
        ? await User.findById(tenantClaim)
        : await getOrCreateUsageUser(tenantClaim);
      if (!captureTenant?._id) {
        return res.status(401).json({ error: 'Invalid or expired capture session token' });
      }
      if (!ipAllowedForAccount(req, captureTenant)) {
        return denyAccountIp(res);
      }
      req.authContext = {
        mode: 'captureSession',
        clerkUserId: captureTenant.clerkId ?? null,
        mongoUserId: captureTenant._id.toString(),
        captureProfileId: claims.profileId,
      };
      return next();
    }

    const apiKeyToken = extractApiKeyToken(req);

    if (apiKeyToken) {
      const apiKey = await authenticateApiKeyToken(apiKeyToken);
      if (!apiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const storedKeyUser = typeof apiKey.userId === 'string' ? apiKey.userId.trim() : '';
      let tenant = null;
      if (mongoose.Types.ObjectId.isValid(storedKeyUser)) {
        tenant = await User.findById(storedKeyUser);
      }
      if (!tenant && storedKeyUser.startsWith('user_')) {
        tenant = await getOrCreateUsageUser(storedKeyUser);
      }
      if (!tenant?._id) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      if (!ipAllowedForAccount(req, tenant)) {
        return denyAccountIp(res);
      }

      const ip = getClientIp(req);
      const keyRules = Array.isArray(apiKey.allowedCidrs) ? apiKey.allowedCidrs : [];
      if (keyRules.length > 0 && canUsePerKeyIpAllowlist(tenant)) {
        if (!ipAllowedByRules(ip, keyRules)) {
          return res.status(403).json({
            error: 'IP address not allowed for this API key',
            code: 'API_KEY_IP_FORBIDDEN'
          });
        }
      }

      req.authContext = {
        mode: 'apiKey',
        clerkUserId: tenant.clerkId ?? null,
        mongoUserId: tenant._id.toString(),
        apiKeyId: apiKey._id.toString(),
      };

      return next();
    }

    const auth = getAuth(req);
    if (!auth?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessionTenant = await getOrCreateUsageUser(auth.userId);
    if (!ipAllowedForAccount(req, sessionTenant)) {
      return denyAccountIp(res);
    }

    req.auth = auth;
    req.authContext = {
      mode: 'userAuth',
      clerkUserId: auth.userId,
      mongoUserId: sessionTenant._id.toString(),
    };

    next();
  } catch (error) {
    next(error);
  }
};
