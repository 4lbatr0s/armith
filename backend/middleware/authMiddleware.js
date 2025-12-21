import { requireAuth, getAuth } from '@clerk/express';

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
  const auth = getAuth(req);
  return auth?.userId || null;
};
