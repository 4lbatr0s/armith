import express from 'express';
import healthRoutes from './healthRoutes.js';
import kycRoutes from './kycRoutes.js';
import adminRoutes from './adminRoutes.js';
import authRoutes from './authRoutes.js';
import configRoutes from './configRoutes.js';

const router = express.Router();

// Mount health routes
router.use('/', healthRoutes);

// Mount auth routes
router.use('/auth', authRoutes);

// Mount KYC routes
router.use('/kyc', kycRoutes);

// Mount admin routes
router.use('/admin', adminRoutes);

// Mount config routes
router.use('/config', configRoutes);

export default router; 