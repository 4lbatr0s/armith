import express from 'express';
import session from 'express-session';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import Kinde authentication
import { setupKinde, protectRoute, getUser, GrantType } from '@kinde-oss/kinde-node-express';

// Import middleware pipeline and routes
import MiddlewarePipeline from './middleware/middlewarePipeline.js';
import routes from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure session middleware (required for Kinde)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Configure Kinde authentication
const kindeConfig = {
  clientId: process.env.KINDE_SERVER_CLIENT_ID,        
  issuerBaseUrl: process.env.KINDE_SERVER_ISSUER_URL,
  siteUrl: process.env.KINDE_SITE_URL,
  secret: process.env.KINDE_SECRET,
  redirectUrl: process.env.KINDE_REDIRECT_URL || "http://localhost:3000/callback",
  scope: process.env.KINDE_SCOPE,
  grantType: GrantType.AUTHORIZATION_CODE  ,
  unAuthorisedUrl: process.env.KINDE_UNAUTHORISED_URL,
  postLogoutRedirectUrl: process.env.KINDE_POST_LOGOUT_REDIRECT_URL
};

setupKinde(kindeConfig, app);

// Configure middleware pipeline (similar to C#'s Configure method)
const middlewarePipeline = MiddlewarePipeline.createDefault(); //butun middllewareler listeye eklenmis oluyo.

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