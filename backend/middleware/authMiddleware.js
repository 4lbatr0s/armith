import { verifyFirebaseToken, getUserOrCreateProfile } from '../lib/firebase.js';

/**
 * Middleware to verify Firebase authentication token
 * Adds user profile to request object
 */
export const authenticateUser = async (req, res, next) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    // Extract the token
    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token missing',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Verify the Firebase token
    const decodedToken = await verifyFirebaseToken(idToken);
    
    // Get or create user profile
    const userProfile = await getUserOrCreateProfile(decodedToken);
    
    // Add user information to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      phoneNumber: decodedToken.phone_number,
      emailVerified: decodedToken.email_verified,
      profile: userProfile
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
      details: error.message
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for endpoints that work with or without authentication
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      
      if (idToken) {
        const decodedToken = await verifyFirebaseToken(idToken);
        const userProfile = await getUserOrCreateProfile(decodedToken);
        
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          phoneNumber: decodedToken.phone_number,
          emailVerified: decodedToken.email_verified,
          profile: userProfile
        };
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    // Continue without authentication for optional auth
    next();
  }
};
