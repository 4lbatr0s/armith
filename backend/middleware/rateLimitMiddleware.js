import rateLimit from 'express-rate-limit';
import { createError } from '../error-codes.js';

/**
 * Rate Limiting Middleware
 * Handles request rate limiting and throttling
 * Similar to C#'s UseRateLimiting() or ConfigureRateLimiting()
 */
class RateLimitMiddleware {
  constructor() {
    this.name = 'RateLimitMiddleware';
  }

  /**
   * Configure and apply rate limiting middleware
   * @param {Express} app - Express application instance
   */
  configure(app) {
    console.log(`⏱️ Configuring ${this.name}...`);
    
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
      message: {
        status: 'failed',
        errors: [createError('RATE_LIMIT_EXCEEDED')]
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      handler: (req, res) => {
        console.log(`🚫 Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          status: 'failed',
          errors: [createError('RATE_LIMIT_EXCEEDED')],
          retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
      }
    });

    app.use(limiter);
    console.log(`✅ ${this.name} configured successfully`);
  }

  /**
   * Create a custom rate limiter for specific routes
   * @param {Object} options - Rate limiting options
   * @returns {Function} Rate limiting middleware
   */
  createCustomLimiter(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: {
        status: 'failed',
        errors: [createError('RATE_LIMIT_EXCEEDED')]
      }
    };

    return rateLimit({ ...defaultOptions, ...options });
  }
}

export default RateLimitMiddleware;
