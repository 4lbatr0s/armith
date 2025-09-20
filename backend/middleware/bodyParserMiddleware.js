import express from 'express';

/**
 * Body Parser Middleware
 * Handles request body parsing and size limits
 * Similar to C#'s UseBodyParsing() or ConfigureBodyParsing()
 */
class BodyParserMiddleware {
  constructor() {
    this.name = 'BodyParserMiddleware';
  }

  /**
   * Configure and apply body parsing middleware
   * @param {Express} app - Express application instance
   */
  configure(app) {
    console.log(`📝 Configuring ${this.name}...`);
    
    // JSON body parser with size limit
    app.use(express.json({ 
      limit: '10mb',
      strict: true,
      type: 'application/json'
    }));

    // URL-encoded body parser
    app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb',
      parameterLimit: 1000
    }));

    // Raw body parser for specific content types
    app.use(express.raw({ 
      limit: '10mb',
      type: 'application/octet-stream'
    }));

    console.log(`✅ ${this.name} configured successfully`);
  }
}

export default BodyParserMiddleware;
