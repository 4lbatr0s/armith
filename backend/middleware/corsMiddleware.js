import cors from 'cors';

/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing configuration
 * Similar to C#'s CorsMiddleware or UseCors()
 */
class CorsMiddleware {
  constructor() {
    this.name = 'CorsMiddleware';
  }

  /**
   * Configure and apply CORS middleware
   * @param {Express} app - Express application instance
   */
  configure(app) {
    console.log(`🌐 Configuring ${this.name}...`);
    
    const corsOptions = {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          return callback(null, true); 
        }
        
        const allowedOrigins = [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          'http://localhost:3000',
          'http://127.0.0.1:3000'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all origins for development
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      optionsSuccessStatus: 200 // Some legacy browsers choke on 204
    };

    app.use(cors(corsOptions));
    
    console.log(`✅ ${this.name} configured successfully`);
  }
}

export default CorsMiddleware;
