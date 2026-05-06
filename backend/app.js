import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { clerkMiddleware } from '@clerk/express';
import dotenv from 'dotenv';
import logger from './lib/logger.js';
import routes from './routes/index.js';
import { connectDB } from './lib/mongodb.js';

dotenv.config();

// Initialize MongoDB
connectDB().catch(err => {
  logger.error({ msg: 'MongoDB connection failed, running without database', error: err.message });
});

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// CORS must run before rate limiting so preflight (OPTIONS) and 429 responses include ACAO etc.
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    const isDevelopment = process.env.NODE_ENV !== 'production';

    const configuredOrigins = [
      process.env.FRONTEND_URL,
      ...(process.env.FRONTEND_URLS || '').split(',').map((item) => item.trim())
    ].filter(Boolean);

    const localOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    const allowedOrigins = isDevelopment
      ? [...configuredOrigins, ...localOrigins]
      : configuredOrigins;

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, allow all origins
      if (isDevelopment) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-api-key',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly (same options as above)
app.options('*', cors());

// Rate limiting — after CORS; do not count OPTIONS (preflight) toward the limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 100),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    message: { success: false, error: 'Too many requests, please try again later' }
  })
);

// Cookie parser
app.use(cookieParser());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Clerk middleware - skip for OPTIONS requests (CORS preflight)
const clerkAuth = clerkMiddleware();
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  return clerkAuth(req, res, next);
});

// Routes
app.use('/', routes);

// Error handling
app.use((err, req, res, next) => {
  logger.error({
    msg: 'Request error',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info({
    msg: 'KYC Flow API server started',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    healthCheck: `http://localhost:${PORT}/health`
  });
});
