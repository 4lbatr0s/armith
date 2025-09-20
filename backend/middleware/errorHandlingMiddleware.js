import { createError } from '../error-codes.js';

/**
 * Error Handling Middleware
 * Handles application-wide error processing and logging
 * Similar to C#'s UseExceptionHandler() or ConfigureExceptionHandling()
 */
class ErrorHandlingMiddleware {
  constructor() {
    this.name = 'ErrorHandlingMiddleware';
  }

  /**
   * Configure and apply error handling middleware
   * @param {Express} app - Express application instance
   */
  configure(app) {
    console.log(`🚨 Configuring ${this.name}...`);
    
    // Global error handler middleware (must be last)
    app.use(this.globalErrorHandler.bind(this));
    
    // 404 handler middleware
    app.use(this.notFoundHandler.bind(this));

    console.log(`✅ ${this.name} configured successfully`);
  }

  /**
   * Global error handler middleware
   * @param {Error} err - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  globalErrorHandler(err, req, res, next) {
    // Log error details
    console.error('🚨 Unhandled error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    const errorResponse = {
      status: 'failed',
      errors: [createError('INTERNAL_SERVER_ERROR')],
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    };

    // Include additional error details in development
    if (isDevelopment) {
      errorResponse.debug = {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
      };
    }

    res.status(500).json(errorResponse);
  }

  /**
   * 404 Not Found handler middleware
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  notFoundHandler(req, res) {
    console.log(`🔍 404 - Route not found: ${req.method} ${req.url}`);
    
    res.status(404).json({
      status: 'failed',
      errors: [{
        code: 'ENDPOINT_NOT_FOUND',
        message: `API endpoint not found: ${req.method} ${req.url}`,
        timestamp: new Date().toISOString()
      }]
    });
  }

  /**
   * Async error wrapper for route handlers
   * @param {Function} fn - Async route handler function
   * @returns {Function} Wrapped route handler
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

export default ErrorHandlingMiddleware;
