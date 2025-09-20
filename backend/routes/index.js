import express from 'express';
import healthRoutes from './healthRoutes.js';
import kycRoutes from './kycRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

// Mount health routes
router.use('/', healthRoutes);

// Mount KYC routes
router.use('/kyc', kycRoutes);

// Mount admin routes
router.use('/admin', adminRoutes);

export default router; 