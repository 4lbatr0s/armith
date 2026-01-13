/**
 * KYC Configuration
 * Single source of truth for errors, thresholds, and validation rules
 */

// ============================================================================
// STATUS TYPES
// ============================================================================

export const STATUS = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FAILED: 'failed',
  PENDING: 'pending'
};

// ============================================================================
// THRESHOLDS
// ============================================================================

export const THRESHOLDS = {
  // ID verification
  fullNameConfidence: 0.8,
  identityNumberConfidence: 0.95,
  dateOfBirthConfidence: 0.9,
  expiryDateConfidence: 0.9,
  imageQuality: 0.7,

  // Selfie verification
  matchConfidence: 80,        // percentage
  faceDetectionConfidence: 0.8,
  spoofingRiskMax: 0.3,       // max allowed spoofing risk

  // Age constraints
  minAge: 18,
  maxAge: 120
};

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERRORS = {
  // ID Verification - Missing fields (1XXX)
  MISSING_FIRST_NAME: { code: 1001, textCode: 'MISSING_FIRST_NAME', message: 'First name could not be detected on ID card.' },
  MISSING_LAST_NAME: { code: 1008, textCode: 'MISSING_LAST_NAME', message: 'Last name could not be detected on ID card.' },
  MISSING_IDENTITY_NUMBER: { code: 1002, textCode: 'MISSING_IDENTITY_NUMBER', message: 'Identity number could not be detected on ID card.' },
  MISSING_DOB: { code: 1003, textCode: 'MISSING_DOB', message: 'Date of birth could not be detected on ID card.' },
  MISSING_EXPIRY_DATE: { code: 1004, textCode: 'MISSING_EXPIRY_DATE', message: 'Expiry date could not be detected on ID card.' },
  MISSING_GENDER: { code: 1005, textCode: 'MISSING_GENDER', message: 'Gender could not be detected on ID card.' },
  MISSING_NATIONALITY: { code: 1006, textCode: 'MISSING_NATIONALITY', message: 'Nationality could not be detected on ID card.' },
  MISSING_SERIAL_NUMBER: { code: 1007, textCode: 'MISSING_SERIAL_NUMBER', message: 'Serial number could not be detected on ID card.' },

  // ID Verification - Invalid data (2XXX)
  INVALID_IDENTITY_NUMBER: { code: 2001, textCode: 'INVALID_IDENTITY_NUMBER', message: 'Identity number format or checksum is invalid.' },
  INVALID_DOB_FORMAT: { code: 2002, textCode: 'INVALID_DOB_FORMAT', message: 'Date of birth format is invalid. Expected YYYY-MM-DD.' },
  INVALID_DOB_LOGIC: { code: 2003, textCode: 'INVALID_DOB_LOGIC', message: 'Date of birth logic is invalid (age constraints).' },
  INVALID_EXPIRY_FORMAT: { code: 2004, textCode: 'INVALID_EXPIRY_FORMAT', message: 'Expiry date format is invalid. Expected YYYY-MM-DD.' },
  EXPIRED_ID: { code: 2005, textCode: 'EXPIRED_ID', message: 'ID card has expired.' },
  EXPIRED_DOCUMENT: { code: 2006, textCode: 'EXPIRED_DOCUMENT', message: 'Document has expired.' },
  INVALID_AGE: { code: 2007, textCode: 'INVALID_AGE', message: 'Age is outside the allowed range.' },
  EXPIRY_WARNING: { code: 2008, textCode: 'EXPIRY_WARNING', message: 'Document is nearing expiry.' },

  // ID Verification - Image issues (3XXX)
  BLURRY_IMAGE: { code: 3001, textCode: 'BLURRY_IMAGE', message: 'ID card image is too blurry to read clearly.' },
  DAMAGED_ID: { code: 3002, textCode: 'DAMAGED_ID', message: 'ID card appears to be damaged or corrupted.' },
  WRONG_CONTENT: { code: 3003, textCode: 'WRONG_CONTENT', message: 'Uploaded image does not contain a valid ID card document.' },

  // Selfie Verification (4XXX)
  LOW_MATCH_CONFIDENCE: { code: 4001, textCode: 'LOW_MATCH_CONFIDENCE', message: 'Face match confidence is below acceptable threshold.' },
  NO_FACE_DETECTED: { code: 4002, textCode: 'NO_FACE_DETECTED', message: 'No face could be detected in the provided image.' },
  MULTIPLE_FACES: { code: 4003, textCode: 'MULTIPLE_FACES', message: 'Multiple faces detected. Please provide a single-person selfie.' },
  POOR_IMAGE_QUALITY: { code: 4004, textCode: 'POOR_IMAGE_QUALITY', message: 'Image quality is too poor for accurate verification.' },
  SPOOFING_DETECTED: { code: 4005, textCode: 'SPOOFING_DETECTED', message: 'Potential spoofing or fake image detected.' },
  INSUFFICIENT_LIGHTING: { code: 4006, textCode: 'INSUFFICIENT_LIGHTING', message: 'Image lighting is insufficient for accurate verification.' },
  FACE_TOO_SMALL: { code: 4007, textCode: 'FACE_TOO_SMALL', message: 'Face in image is too small for accurate verification.' },
  FACE_PARTIALLY_COVERED: { code: 4008, textCode: 'FACE_PARTIALLY_COVERED', message: 'Face is partially covered or obscured.' },

  // System Errors (5XXX)
  INVALID_IMAGE_URL: { code: 5001, textCode: 'INVALID_IMAGE_URL', message: 'Provided image URL is invalid or inaccessible.' },
  GROQ_API_ERROR: { code: 5002, textCode: 'GROQ_API_ERROR', message: 'Groq API error occurred during verification.' },
  INVALID_JSON_RESPONSE: { code: 5003, textCode: 'INVALID_JSON_RESPONSE', message: 'AI response was not valid JSON format.' },
  INTERNAL_ERROR: { code: 5004, textCode: 'INTERNAL_ERROR', message: 'An internal server error occurred.' },
  VERIFICATION_ERROR: { code: 5005, textCode: 'VERIFICATION_ERROR', message: 'Verification error occurred.' },
  LOW_CONFIDENCE: { code: 5006, textCode: 'LOW_CONFIDENCE', message: 'Confidence score is below acceptable threshold.' },
  INVALID_REQUEST: { code: 6001, textCode: 'INVALID_REQUEST', message: 'Invalid request parameters.' }
};

const errorCodeToText = Object.entries(ERRORS).reduce((acc, [key, val]) => {
  acc[val.code] = key;
  return acc;
}, {});

/**
 * Format a structured error object with both text and numeric codes
 * @param {object|string} error - Error object from ERRORS or raw string code
 * @param {string} [field] - Field involved
 * @param {string} [customMessage] - Custom message
 * @returns {object} Structured error
 */
export function formatStructuredError(error, field = '', customMessage = '') {
  const errorObj = typeof error === 'string' ? (ERRORS[error] || { code: 9999, textCode: error, message: customMessage || error }) : error;

  return {
    code: errorObj.textCode || errorCodeToText[errorObj.code] || 'UNKNOWN_ERROR',
    numericCode: errorObj.code,
    field: field || '',
    message: customMessage || errorObj.message
  };
}

// ============================================================================
// TURKISH ID VALIDATION
// ============================================================================

/**
 * Validate Turkish ID number (TC Kimlik No) checksum
 * @param {string} tcNo - 11 digit Turkish ID number
 * @returns {{ valid: boolean, error?: object }}
 */
export function validateTcKimlik(tcNo) {
  // Must be 11 digits
  if (!tcNo || !/^\d{11}$/.test(tcNo)) {
    return { valid: false, error: ERRORS.INVALID_IDENTITY_NUMBER };
  }

  // First digit cannot be 0
  if (tcNo[0] === '0') {
    return { valid: false, error: ERRORS.INVALID_IDENTITY_NUMBER };
  }

  const digits = tcNo.split('').map(Number);

  // 10th digit = ((sum of odd positions * 7) - sum of even positions) mod 10
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const checkDigit1 = ((oddSum * 7) - evenSum) % 10;

  // Handle negative modulo
  const normalizedCheck1 = checkDigit1 < 0 ? checkDigit1 + 10 : checkDigit1;

  if (digits[9] !== normalizedCheck1) {
    return { valid: false, error: ERRORS.INVALID_IDENTITY_NUMBER };
  }

  // 11th digit = (sum of first 10 digits) mod 10
  const sumFirst10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  const checkDigit2 = sumFirst10 % 10;

  if (digits[10] !== checkDigit2) {
    return { valid: false, error: ERRORS.INVALID_IDENTITY_NUMBER };
  }

  return { valid: true };
}

// ============================================================================
// DATE VALIDATION
// ============================================================================

/**
 * Validate date format and logic
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {'dob' | 'expiry'} type - Type of date
 * @returns {{ valid: boolean, error?: object }}
 */
export function validateDate(dateString, type) {
  if (!dateString) {
    return {
      valid: false,
      error: type === 'dob' ? ERRORS.MISSING_DOB : ERRORS.MISSING_EXPIRY_DATE
    };
  }

  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return {
      valid: false,
      error: type === 'dob' ? ERRORS.INVALID_DOB_FORMAT : ERRORS.INVALID_EXPIRY_FORMAT
    };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: type === 'dob' ? ERRORS.INVALID_DOB_FORMAT : ERRORS.INVALID_EXPIRY_FORMAT
    };
  }

  const now = new Date();

  if (type === 'dob') {
    // Date of birth cannot be in the future
    if (date > now) {
      return { valid: false, error: ERRORS.INVALID_DOB_LOGIC };
    }

    // Age constraints
    const age = now.getFullYear() - date.getFullYear();
    if (age < THRESHOLDS.minAge || age > THRESHOLDS.maxAge) {
      return { valid: false, error: ERRORS.INVALID_DOB_LOGIC };
    }
  }

  if (type === 'expiry') {
    // Check if expired
    if (date < now) {
      return { valid: false, error: ERRORS.EXPIRED_ID };
    }
  }

  return { valid: true };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine verification status based on errors
 * @param {Array} errors - Array of error objects
 * @param {Object} options - Additional options for selfie verification
 * @returns {string} Status value
 */
export function determineStatus(errors, options = {}) {
  // System failures
  const systemErrorCodes = [5002, 5003, 5004];
  if (errors.some(e => systemErrorCodes.includes(e.code) || systemErrorCodes.includes(e.numericCode))) {
    return STATUS.FAILED;
  }

  // No errors = approved
  if (errors.length === 0) {
    // For selfie, also check match result
    if (options.isMatch !== undefined) {
      return options.isMatch && (options.matchConfidence >= THRESHOLDS.matchConfidence)
        ? STATUS.APPROVED
        : STATUS.REJECTED;
    }
    return STATUS.APPROVED;
  }

  // Critical errors = rejected
  const criticalErrorCodes = [1001, 1008, 1002, 2001, 2005, 4005, 4002];

  if (errors.some(e => criticalErrorCodes.includes(e.code) || criticalErrorCodes.includes(e.numericCode))) {
    return STATUS.REJECTED;
  }

  return STATUS.REJECTED; // Default to REJECTED if any validation error present
}
