import helmet from 'helmet';

/**
 * Security Middleware
 * Handles security-related headers and configurations
 * Similar to C#'s SecurityMiddleware or UseSecurityHeaders()
 */
class SecurityMiddleware {
  constructor() {
    this.name = 'SecurityMiddleware';
  }

  /**
   * Configure and apply security middleware
   * @param {Express} app - Express application instance
   */
  configure(app) {
    console.log(`🔒 Configuring ${this.name}...`);
    
    // Apply Helmet for security headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:", "http:"], // Allow HTTP images for local development
          connectSrc: ["'self'", "http:", "https:"], // Allow HTTP connections for local development
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow images from different origins
      crossOriginResourcePolicy: false, // Allow cross-origin resource access
      crossOriginOpenerPolicy: false, // Allow cross-origin opener access
    }));

    console.log(`✅ ${this.name} configured successfully`);
  }
}

export default SecurityMiddleware;
