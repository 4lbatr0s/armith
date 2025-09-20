import SecurityMiddleware from './securityMiddleware.js';
import CorsMiddleware from './corsMiddleware.js';
import BodyParserMiddleware from './bodyParserMiddleware.js';
import RateLimitMiddleware from './rateLimitMiddleware.js';
import LoggingMiddleware from './loggingMiddleware.js';
import RoutingMiddleware from './routingMiddleware.js';
import ErrorHandlingMiddleware from './errorHandlingMiddleware.js';

/**
 * Middleware Pipeline Manager
 * Manages the registration and execution order of middleware
 * Similar to C#'s Configure() method or UseMiddleware() pattern
 */
class MiddlewarePipeline {
  constructor() {
    this.middlewares = [];
    this.isConfigured = false;
  }

  /**
   * Register middleware in the pipeline
   * @param {Object} middleware - Middleware instance
   * @param {number} order - Optional order number (lower numbers execute first)
   * @returns {MiddlewarePipeline} This instance for method chaining
   */
  use(middleware, order = null) {
    if (this.isConfigured) {
      throw new Error('Cannot add middleware after pipeline has been configured');
    }

    this.middlewares.push({
      middleware,
      order: order !== null ? order : this.middlewares.length,
      name: middleware.name || 'UnknownMiddleware'
    });

    console.log(`📝 Registered middleware: ${middleware.name || 'Unknown'}`);
    
    return this;
  }

  /**
   * Configure all registered middleware on the Express app
   * @param {Express} app - Express application instance
   * @param {Object} routes - Routes to register (optional)
   */
  configure(app) {
    if (this.isConfigured) {
      throw new Error('Pipeline has already been configured');
    }

    console.log('🔧 Configuring middleware pipeline...');
    
    // Sort middleware by order
    this.middlewares.sort((a, b) => a.order - b.order);
    
    // Apply each middleware in order
    this.middlewares.forEach(({ middleware, name }) => {
      try {
        // Pass routes to routing middleware
          middleware.configure(app);
      } catch (error) {
        console.error(`❌ Failed to configure ${name}:`, error);
        throw error;
      }
    });

    this.isConfigured = true;
    
    console.log('✅ Middleware pipeline configured successfully');
  }


  /**
   * Get the current middleware configuration
   * @returns {Array} Array of registered middleware info
   */
  getConfiguration() {
    return this.middlewares.map(({ middleware, order, name }) => ({
      name,
      order,
      className: middleware.constructor.name
    }));
  }

  /**
   * Create a default middleware pipeline with standard middleware
   * @returns {MiddlewarePipeline} Configured pipeline instance
   */
  static createDefault() {
    const pipeline = new MiddlewarePipeline();
    
    // Add middleware in execution order (similar to C# Configure method)
    pipeline
      .use(new SecurityMiddleware(), 1)      // Security headers first
      .use(new CorsMiddleware(), 2)          // CORS configuration
      .use(new BodyParserMiddleware(), 3)    // Body parsing
      .use(new LoggingMiddleware(), 4)       // Request logging
      .use(new RateLimitMiddleware(), 5)     // Rate limiting
      .use(new RoutingMiddleware(), 6)       // Routing configuration
      .use(new ErrorHandlingMiddleware(), 99); // Error handling last
    
    return pipeline;
  }
}

export default MiddlewarePipeline;
