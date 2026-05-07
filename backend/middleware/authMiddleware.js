import { requireAuth, getAuth } from '@clerk/express';
import { authenticateApiKeyToken } from '../services/apiKeyService.js';
import { getClientIp } from '../lib/clientIp.js';
import { ipAllowedByRules } from '../lib/ipAllowlist.js';
import { canUsePerKeyIpAllowlist } from '../lib/planFeatures.js';
import { User } from '../models/User.js';
import { verifyCaptureSessionToken } from '../lib/captureSessionToken.js';

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

/**
 * Get current user ID from request
 */
export const getUserId = (req) => {
  return req.authContext?.userId || getAuth(req)?.userId || null;
};

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
      req.authContext = {
        mode: 'captureSession',
        userId: claims.tenantUserId,
        captureProfileId: claims.profileId
      };
      return next();
    }

    const apiKeyToken = extractApiKeyToken(req);

    if (apiKeyToken) {
      const apiKey = await authenticateApiKeyToken(apiKeyToken);
      if (!apiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const ip = getClientIp(req);
      const tenant = await User.findOne({ clerkId: apiKey.userId }).lean();
      const accountRules = Array.isArray(tenant?.apiAllowedCidrs) ? tenant.apiAllowedCidrs : [];
      if (accountRules.length > 0) {
        if (!ipAllowedByRules(ip, accountRules)) {
          return res.status(403).json({
            error: 'IP address not allowed for this account',
            code: 'ACCOUNT_IP_FORBIDDEN'
          });
        }
      }

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
        userId: apiKey.userId,
        apiKeyId: apiKey._id.toString()
      };

      return next();
    }

    const auth = getAuth(req);
    if (!auth?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.auth = auth;
    req.authContext = {
      mode: 'userAuth',
      userId: auth.userId
    };

    next();
  } catch (error) {
    next(error);
  }
};
