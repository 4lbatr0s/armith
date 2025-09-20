import { KycIdSchema, KycSelfieSchema } from './schemas.js';

/**
 * Validation utilities for KYC responses and requests
 * Centralized validation logic for consistent error handling
 */

/**
 * Validate and parse ID response from AI
 * @param {Object} response - Raw response from AI
 * @returns {Object} Validation result with success flag and data/error
 */
const validateIdResponse = (response) => {
  try {
    const parsed = KycIdSchema.safeParse(response);
    
    if (!parsed.success) {
      console.error('ID schema validation failed:', parsed.error);
      return {
        success: false,
        error: 'Invalid response format from AI',
        details: parsed.error.errors
      };
    }
    return {
      success: true,
      data: parsed.data
    };
  } catch (error) {
    console.error('Error validating ID response:', error);
    return {
      success: false,
      error: 'Failed to validate response'
    };
  }
};

/**
 * Validate and parse selfie response from AI
 * @param {Object} response - Raw response from AI
 * @returns {Object} Validation result with success flag and data/error
 */
const validateSelfieResponse = (response) => {
  try {
    const parsed = KycSelfieSchema.safeParse(response);
    if (!parsed.success) {
      console.error('Selfie schema validation failed:', parsed.error);
      return {
        success: false,
        error: 'Invalid response format from AI',
        details: parsed.error.errors
      };
    }
    return {
      success: true,
      data: parsed.data
    };
  } catch (error) {
    console.error('Error validating selfie response:', error);
    return {
      success: false,
      error: 'Failed to validate response'
    };
  }
};

/**
 * Generic request validation function
 * @param {Object} schema - Zod schema to validate against
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result with success flag and data/errors
 */
const validateRequest = (schema, data) => {
  try {
    const parsed = schema.safeParse(data);
    
    if (!parsed.success) {
      return {
        success: false,
        error: 'Invalid request data',
        details: parsed.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: true,
      data: parsed.data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to validate request'
    };
  }
};

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} Whether the date format is valid
 */
const validateDateFormat = (dateString) => {
  if (!dateString) return true; // Allow empty/null dates
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(dateString);
};

/**
 * Validate identity number format for Turkish IDs (11 digits)
 * @param {string} identityNumber - Identity number to validate
 * @returns {boolean} Whether the identity number format is valid
 */
const validateTurkishIdentityNumber = (identityNumber) => {
  if (!identityNumber) return true; // Allow empty/null
  const turkishIdRegex = /^\d{11}$/;
  return turkishIdRegex.test(identityNumber);
};

/**
 * Validate confidence percentage format (e.g., "85%")
 * @param {string} confidence - Confidence string to validate
 * @returns {boolean} Whether the confidence format is valid
 */
const validateConfidenceFormat = (confidence) => {
  if (!confidence) return true; // Allow empty/null
  const confidenceRegex = /^\d+%$/;
  return confidenceRegex.test(confidence);
};

/**
 * Sanitize and validate extracted data from ID verification
 * @param {Object} idData - Raw ID data from AI
 * @returns {Object} Sanitized and validated ID data
 */
const sanitizeIdData = (idData) => {
  const sanitized = { ...idData };
  
  // Ensure dates are in correct format
  if (sanitized.dateOfBirth && !validateDateFormat(sanitized.dateOfBirth)) {
    console.warn('Invalid date format for dateOfBirth:', sanitized.dateOfBirth);
    sanitized.dateOfBirth = null;
  }
  
  if (sanitized.expiryDate && !validateDateFormat(sanitized.expiryDate)) {
    console.warn('Invalid date format for expiryDate:', sanitized.expiryDate);
    sanitized.expiryDate = null;
  }
  
  // Ensure arrays are properly initialized
  if (!sanitized.errors) {
    sanitized.errors = [];
  }
  
  return sanitized;
};

/**
 * Sanitize and validate extracted data from selfie verification
 * @param {Object} selfieData - Raw selfie data from AI
 * @returns {Object} Sanitized and validated selfie data
 */
const sanitizeSelfieData = (selfieData) => {
  const sanitized = { ...selfieData };
  
  // Validate confidence format
  if (sanitized.matchConfidence && !validateConfidenceFormat(sanitized.matchConfidence)) {
    console.warn('Invalid confidence format:', sanitized.matchConfidence);
    sanitized.matchConfidence = null;
  }
  
  // Ensure arrays are properly initialized
  if (!sanitized.errors) {
    sanitized.errors = [];
  }
  if (!sanitized.imageQualityIssues) {
    sanitized.imageQualityIssues = [];
  }
  if (!sanitized.rejectionReasons) {
    sanitized.rejectionReasons = [];
  }
  
  return sanitized;
};

export {
  validateIdResponse,
  validateSelfieResponse,
  validateRequest,
  validateDateFormat,
  validateTurkishIdentityNumber,
  validateConfidenceFormat,
  sanitizeIdData,
  sanitizeSelfieData
};
