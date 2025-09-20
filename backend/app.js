import express from 'express';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import middleware pipeline and routes
import MiddlewarePipeline from './middleware/middlewarePipeline.js';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure middleware pipeline (similar to C#'s Configure method)
const middlewarePipeline = MiddlewarePipeline.createDefault();

middlewarePipeline.configure(app, routes);

// Note: Error handling and 404 handling are now managed by the middleware pipeline

// Start server
app.listen(PORT, () => {
  console.log(`🚀 KYC Flow API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI Provider: Groq (Llama 4 Scout 17Bx16E)`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Middleware Pipeline:`);
  middlewarePipeline.getConfiguration().forEach(({ name, order }) => {
    console.log(`   ${order}. ${name}`);
  });
}); 