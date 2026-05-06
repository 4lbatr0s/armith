import { requireAuth, getAuth } from '@clerk/express';
import { authenticateApiKeyToken } from '../services/apiKeyService.js';

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
    const apiKeyToken = extractApiKeyToken(req);

    if (apiKeyToken) {
      const apiKey = await authenticateApiKeyToken(apiKeyToken);
      if (!apiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
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
