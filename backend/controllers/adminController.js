/**
 * Admin Controller
 * Admin endpoints for viewing verifications and managing settings
 */

import { ERRORS, STATUS } from '../kyc/config.js';
import { Profile, IdCardValidation, SelfieValidation, KycConfiguration } from '../models/index.js';
import { createDefaultConfig, PRESETS } from '../kyc/defaults.js';

/**
 * Get all verifications (admin endpoint)
 */
export const getVerifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = status ? { status } : {};

    const [profiles, total] = await Promise.all([
      Profile.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Profile.countDocuments(filter)
    ]);

    res.json({
      users: profiles.map(p => ({
        id: p._id,
        fullName: p.fullName,
        identityNumber: p.identityNumber,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        nationality: p.nationality,
        country: p.country,
        status: p.status,
        createdAt: p.createdAt,
        
        // Additional ID card information
        serialNumber: p.serialNumber,
        expiryDate: p.expiryDate,
        address: p.address,
        documentCondition: p.documentCondition,
        
        // Confidence scores
        overallConfidence: p.overallConfidence,
        selfieMatchConfidence: p.selfieMatchConfidence,
        selfieSpoofingRisk: p.selfieSpoofingRisk,
        
        // Image URLs
        idFrontImageUrl: p.idFrontImageUrl,
        idBackImageUrl: p.idBackImageUrl,
        selfieImageUrl: p.selfieImageUrl,
        
        // Verification metadata
        verificationAttempts: p.verificationAttempts || 0,
        lastVerificationAttempt: p.lastVerificationAttempt,
        rejectionReasons: p.rejectionReasons || [],
        
        // Verification statuses from Profile schema
        idVerification: {
          status: p.idVerificationStatus,
          completed: !!p.idVerificationStatus,
          completedAt: p.idVerificationStatus ? p.updatedAt : null
        },
        selfieVerification: {
          status: p.selfieVerificationStatus,
          completed: !!p.selfieVerificationStatus,
          completedAt: p.selfieVerificationStatus ? p.updatedAt : null
        }
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: skip + profiles.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Admin verifications error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/**
 * Get verification statistics
 */
export const getStats = async (req, res) => {
  try {
    const [total, approved, rejected, pending] = await Promise.all([
      Profile.countDocuments(),
      Profile.countDocuments({ status: 'APPROVED' }),
      Profile.countDocuments({ status: 'REJECTED' }),
      Profile.countDocuments({ status: 'PENDING' })
    ]);

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    res.json({ totalVerifications: total, approvedCount: approved, rejectedCount: rejected, pendingCount: pending, approvalRate });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/**
 * Get current settings (uses KycConfiguration)
 */
export const getSettings = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    let config = await KycConfiguration.findOne({ userId, environment: 'production' });

    if (!config) {
      const defaultConfig = createDefaultConfig(userId);
      config = await KycConfiguration.create(defaultConfig);
    }

    res.json({
      settings: {
        verificationRules: config.verificationSteps,
        thresholds: {
          ...flattenThresholds(config.idCardThresholds),
          ...flattenSelfieThresholds(config.selfieThresholds),
          minAge: config.validationRules.minAge,
        }
      },
      defaults: PRESETS.balanced
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/**
 * Update settings
 */
export const updateSettings = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { verificationRules, thresholds } = req.body;

    const config = await KycConfiguration.findOne({ userId, environment: 'production' });
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    if (verificationRules) {
      Object.assign(config.verificationSteps, verificationRules);
    }

    if (thresholds) {
      applyThresholdUpdates(config, thresholds);
    }

    config.version += 1;
    await config.save();

    res.json({ success: true, settings: config, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/**
 * Reset settings to defaults
 */
export const resetSettings = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const defaultConfig = createDefaultConfig(userId);

    const config = await KycConfiguration.findOneAndUpdate(
      { userId, environment: 'production' },
      defaultConfig,
      { upsert: true, new: true }
    );

    res.json({ success: true, settings: config, message: 'Settings reset to defaults' });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

// ============================================================================
// HELPERS
// ============================================================================

function flattenThresholds(idCardThresholds) {
  return {
    fullNameConfidence: idCardThresholds.minFullNameConfidence,
    identityNumberConfidence: idCardThresholds.minIdentityNumberConfidence,
    dateOfBirthConfidence: idCardThresholds.minDateOfBirthConfidence,
    expiryDateConfidence: idCardThresholds.minExpiryDateConfidence,
    imageQuality: idCardThresholds.minImageQuality,
  };
}

function flattenSelfieThresholds(selfieThresholds) {
  return {
    matchConfidence: selfieThresholds.minMatchConfidence,
    faceDetectionConfidence: selfieThresholds.minFacialFeatureConfidence,
    spoofingRiskMax: selfieThresholds.maxSpoofingRisk,
  };
}

function applyThresholdUpdates(config, thresholds) {
  if (thresholds.fullNameConfidence) config.idCardThresholds.minFullNameConfidence = thresholds.fullNameConfidence;
  if (thresholds.identityNumberConfidence) config.idCardThresholds.minIdentityNumberConfidence = thresholds.identityNumberConfidence;
  if (thresholds.imageQuality) config.idCardThresholds.minImageQuality = thresholds.imageQuality;
  if (thresholds.matchConfidence) config.selfieThresholds.minMatchConfidence = thresholds.matchConfidence;
  if (thresholds.spoofingRiskMax) config.selfieThresholds.maxSpoofingRisk = thresholds.spoofingRiskMax;
  if (thresholds.minAge) config.validationRules.minAge = thresholds.minAge;
}