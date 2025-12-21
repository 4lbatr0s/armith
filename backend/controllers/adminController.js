import { ERRORS, STATUS } from '../kyc/config.js';
import { readDatabase, readSettings, writeSettings, getDefaultSettings } from '../utils/database.js';

// Admin endpoint to list all verifications
export const getVerifications = async (req, res) => {
  try {
    const database = await readDatabase();
    const { page = 1, limit = 10, status } = req.query;

    let users = database.users;

    // Filter by status if provided
    if (status) {
      users = users.filter(user => user.status === status);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = users.slice(startIndex, endIndex);

    res.json({
      users: paginatedUsers.map(user => ({
        id: user.id,
        country: user.country,
        status: user.status,
        createdAt: user.createdAt,
        hasIdResult: !!user.idResult,
        hasSelfieResult: !!user.selfieResult
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(users.length / limit),
        totalUsers: users.length,
        hasNext: endIndex < users.length,
        hasPrev: startIndex > 0
      }
    });
  } catch (error) {
    console.error('Admin verifications error:', error);
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};

// Admin endpoint to get verification statistics
export const getStats = async (req, res) => {
  try {
    const database = await readDatabase();
    const users = database.users;

    const totalVerifications = users.length;
    const approvedCount = users.filter(u => u.status === 'approved').length;
    const rejectedCount = users.filter(u => u.status === 'rejected').length;
    const pendingCount = users.filter(u => u.status === 'pending').length;

    const approvalRate = totalVerifications > 0
      ? Math.round((approvedCount / totalVerifications) * 100)
      : 0;

    // Calculate average processing time (mock for now or calc if dates exist)
    // For simplicity, we'll return the counts

    res.json({
      totalVerifications,
      approvedCount,
      rejectedCount,
      pendingCount,
      approvalRate
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};

// ============================================================================
// SETTINGS ENDPOINTS
// ============================================================================

// Get current settings
export const getSettings = async (req, res) => {
  try {
    const settings = await readSettings();
    const defaults = getDefaultSettings();
    
    res.json({
      settings,
      defaults
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};

// Update settings
export const updateSettings = async (req, res) => {
  try {
    const { verificationRules, thresholds } = req.body;
    const currentSettings = await readSettings();
    
    // Validate verification rules
    if (verificationRules) {
      // At least one verification method must be enabled
      if (!verificationRules.requireIdCard && !verificationRules.requireSelfie) {
        return res.status(400).json({
          status: STATUS.FAILED,
          errors: [{
            code: 'INVALID_SETTINGS',
            message: 'At least one verification method (ID Card or Selfie) must be enabled'
          }]
        });
      }
      currentSettings.verificationRules = {
        ...currentSettings.verificationRules,
        ...verificationRules
      };
    }
    
    // Validate and update thresholds
    if (thresholds) {
      const validatedThresholds = validateThresholds(thresholds);
      if (validatedThresholds.errors.length > 0) {
        return res.status(400).json({
          status: STATUS.FAILED,
          errors: validatedThresholds.errors
        });
      }
      currentSettings.thresholds = {
        ...currentSettings.thresholds,
        ...validatedThresholds.data
      };
    }
    
    // Update metadata
    currentSettings.metadata = {
      lastUpdated: new Date().toISOString(),
      updatedBy: req.auth?.userId || 'admin'
    };
    
    const success = await writeSettings(currentSettings);
    
    if (!success) {
      return res.status(500).json({
        status: STATUS.FAILED,
        errors: [{ code: 'SAVE_FAILED', message: 'Failed to save settings' }]
      });
    }
    
    res.json({
      success: true,
      settings: currentSettings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};

// Reset settings to defaults
export const resetSettings = async (req, res) => {
  try {
    const defaults = getDefaultSettings();
    defaults.metadata = {
      lastUpdated: new Date().toISOString(),
      updatedBy: req.auth?.userId || 'admin'
    };
    
    const success = await writeSettings(defaults);
    
    if (!success) {
      return res.status(500).json({
        status: STATUS.FAILED,
        errors: [{ code: 'SAVE_FAILED', message: 'Failed to reset settings' }]
      });
    }
    
    res.json({
      success: true,
      settings: defaults,
      message: 'Settings reset to defaults'
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      status: STATUS.FAILED,
      errors: [ERRORS.INTERNAL_ERROR]
    });
  }
};

// Helper function to validate thresholds
function validateThresholds(thresholds) {
  const errors = [];
  const data = {};
  
  // Confidence thresholds (0-1)
  const confidenceFields = [
    'fullNameConfidence',
    'identityNumberConfidence',
    'dateOfBirthConfidence',
    'expiryDateConfidence',
    'imageQuality',
    'faceDetectionConfidence',
    'spoofingRiskMax'
  ];
  
  for (const field of confidenceFields) {
    if (thresholds[field] !== undefined) {
      const value = parseFloat(thresholds[field]);
      if (isNaN(value) || value < 0 || value > 1) {
        errors.push({
          code: 'INVALID_THRESHOLD',
          message: `${field} must be between 0 and 1`
        });
      } else {
        data[field] = value;
      }
    }
  }
  
  // Match confidence (0-100)
  if (thresholds.matchConfidence !== undefined) {
    const value = parseFloat(thresholds.matchConfidence);
    if (isNaN(value) || value < 0 || value > 100) {
      errors.push({
        code: 'INVALID_THRESHOLD',
        message: 'matchConfidence must be between 0 and 100'
      });
    } else {
      data.matchConfidence = value;
    }
  }
  
  // Age constraints
  if (thresholds.minAge !== undefined) {
    const value = parseInt(thresholds.minAge);
    if (isNaN(value) || value < 0 || value > 120) {
      errors.push({
        code: 'INVALID_THRESHOLD',
        message: 'minAge must be between 0 and 120'
      });
    } else {
      data.minAge = value;
    }
  }
  
  if (thresholds.maxAge !== undefined) {
    const value = parseInt(thresholds.maxAge);
    if (isNaN(value) || value < 0 || value > 150) {
      errors.push({
        code: 'INVALID_THRESHOLD',
        message: 'maxAge must be between 0 and 150'
      });
    } else {
      data.maxAge = value;
    }
  }
  
  // Validate minAge < maxAge
  if (data.minAge !== undefined && data.maxAge !== undefined && data.minAge >= data.maxAge) {
    errors.push({
      code: 'INVALID_THRESHOLD',
      message: 'minAge must be less than maxAge'
    });
  }
  
  return { errors, data };
} 