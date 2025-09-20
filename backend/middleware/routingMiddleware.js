import express from 'express';
import routes from '../routes/index.js';
/**
 * Routing Middleware
 * Handles route registration and configuration
 * Similar to C#'s UseRouting() or MapControllers()
 */
class RoutingMiddleware {
  constructor() {
    this.name = 'RoutingMiddleware';
  }

  /**
   * Configure and apply routing middleware
   * @param {Express} app - Express application instance
   * @param {Object} routes - Routes to register (optional)
   */
  configure(app) {
    console.log(`🛣️ Configuring ${this.name}...`);
    
    console.log(`📋 Registering routes...`);

    app.use('/', routes);

    console.log(`   ✅ Main routes registered`);
    
    console.log(`✅ ${this.name} configured successfully`);
  }

  /**
   * Log all registered routes for debugging
   * @param {Express} app - Express application instance
   */
  logRegisteredRoutes(app) {
    const routes = [];
    
    // Extract routes from Express app
    app._router?.stack?.forEach((middleware) => {
      if (middleware.route) {
        // Direct route
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
        routes.push(`${methods} ${middleware.route.path}`);
      } else if (middleware.name === 'router') {
        // Router middleware
        middleware.handle?.stack?.forEach((handler) => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
            routes.push(`${methods} ${handler.route.path}`);
          }
        });
      }
    });

    if (routes.length > 0) {
      console.log(`📋 Registered Routes:`);
      routes.forEach(route => console.log(`   ${route}`));
    }
  }

  /**
   * Create a route group with common middleware
   * @param {string} prefix - Route prefix
   * @param {Array} middleware - Array of middleware functions
   * @returns {Function} Route group middleware
   */
  createRouteGroup(prefix, middleware = []) {
    return (app) => {
      const router = express.Router();
      
      // Apply middleware to router
      middleware.forEach(mw => router.use(mw));
      
      // Mount router with prefix
      app.use(prefix, router);
      
      return router;
    };
  }

  /**
   * Add route with automatic error handling
   * @param {Object} router - Express router
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @param {Function} handler - Route handler function
   */
  addRoute(router, method, path, handler) {
    const asyncHandler = async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        next(error);
      }
    };

    router[method.toLowerCase()](path, asyncHandler);
  }
}

export default RoutingMiddleware;
