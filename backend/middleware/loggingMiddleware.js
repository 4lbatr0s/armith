/**
 * Request Logging Middleware
 * Handles request/response logging and monitoring
 * Similar to C#'s UseRequestLogging() or ConfigureLogging()
 */
class LoggingMiddleware {
  constructor() {
    this.name = 'LoggingMiddleware';
  }

  /**
   * Configure and apply logging middleware
   * @param {Express} app - Express application instance
   */
  configure(app) {
    console.log(`📊 Configuring ${this.name}...`);
    
    // Request logging middleware
    app.use(this.requestLogger.bind(this));
    
    // Response logging middleware
    app.use(this.responseLogger.bind(this));

    console.log(`✅ ${this.name} configured successfully`);
  }

  /**
   * Request logging middleware
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  requestLogger(req, res, next) {
    const startTime = Date.now();
    
    // Generate unique request ID
    req.id = this.generateRequestId();
    
    // Log incoming request
    console.log(`📥 ${req.method} ${req.url} - IP: ${req.ip} - ID: ${req.id}`, {
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      timestamp: new Date().toISOString()
    });

    // Store start time for response logging
    req.startTime = startTime;
    
    next();
  }

  /**
   * Response logging middleware
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  responseLogger(req, res, next) {
    const originalSend = res.send;
    
    res.send = function(data) {
      const duration = Date.now() - req.startTime;
      
      // Log response
      console.log(`📤 ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - ID: ${req.id}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: data ? data.length : 0,
        timestamp: new Date().toISOString()
      });
      
      originalSend.call(this, data);
    };
    
    next();
  }

  /**
   * Generate unique request ID
   * @returns {string} Unique request identifier
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default LoggingMiddleware;
