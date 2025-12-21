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
  // ID Verification - Missing fields
  MISSING_FULL_NAME: { code: 'MISSING_FULL_NAME', message: 'Full name could not be detected on ID card.' },
  MISSING_IDENTITY_NUMBER: { code: 'MISSING_IDENTITY_NUMBER', message: 'Identity number could not be detected on ID card.' },
  MISSING_DOB: { code: 'MISSING_DOB', message: 'Date of birth could not be detected on ID card.' },
  MISSING_EXPIRY_DATE: { code: 'MISSING_EXPIRY_DATE', message: 'Expiry date could not be detected on ID card.' },
  MISSING_GENDER: { code: 'MISSING_GENDER', message: 'Gender could not be detected on ID card.' },
  MISSING_NATIONALITY: { code: 'MISSING_NATIONALITY', message: 'Nationality could not be detected on ID card.' },
  MISSING_SERIAL_NUMBER: { code: 'MISSING_SERIAL_NUMBER', message: 'Serial number could not be detected on ID card.' },
  
  // ID Verification - Invalid data
  INVALID_IDENTITY_NUMBER: { code: 'INVALID_IDENTITY_NUMBER', message: 'Identity number format or checksum is invalid.' },
  INVALID_DOB_FORMAT: { code: 'INVALID_DOB_FORMAT', message: 'Date of birth format is invalid. Expected YYYY-MM-DD.' },
  INVALID_DOB_LOGIC: { code: 'INVALID_DOB_LOGIC', message: 'Date of birth logic is invalid (age constraints).' },
  INVALID_EXPIRY_FORMAT: { code: 'INVALID_EXPIRY_FORMAT', message: 'Expiry date format is invalid. Expected YYYY-MM-DD.' },
  EXPIRED_ID: { code: 'EXPIRED_ID', message: 'ID card has expired.' },
  EXPIRED_DOCUMENT: { code: 'EXPIRED_DOCUMENT', message: 'Document has expired.' },
  
  // ID Verification - Image issues
  BLURRY_IMAGE: { code: 'BLURRY_IMAGE', message: 'ID card image is too blurry to read clearly.' },
  DAMAGED_ID: { code: 'DAMAGED_ID', message: 'ID card appears to be damaged or corrupted.' },
  WRONG_CONTENT: { code: 'WRONG_CONTENT', message: 'Uploaded image does not contain a valid ID card document.' },
  
  // Selfie Verification
  LOW_MATCH_CONFIDENCE: { code: 'LOW_MATCH_CONFIDENCE', message: 'Face match confidence is below acceptable threshold.' },
  NO_FACE_DETECTED: { code: 'NO_FACE_DETECTED', message: 'No face could be detected in the provided image.' },
  MULTIPLE_FACES: { code: 'MULTIPLE_FACES', message: 'Multiple faces detected. Please provide a single-person selfie.' },
  POOR_IMAGE_QUALITY: { code: 'POOR_IMAGE_QUALITY', message: 'Image quality is too poor for accurate verification.' },
  SPOOFING_DETECTED: { code: 'SPOOFING_DETECTED', message: 'Potential spoofing or fake image detected.' },
  INSUFFICIENT_LIGHTING: { code: 'INSUFFICIENT_LIGHTING', message: 'Image lighting is insufficient for accurate verification.' },
  FACE_TOO_SMALL: { code: 'FACE_TOO_SMALL', message: 'Face in image is too small for accurate verification.' },
  FACE_PARTIALLY_COVERED: { code: 'FACE_PARTIALLY_COVERED', message: 'Face is partially covered or obscured.' },
  
  // System Errors
  INVALID_IMAGE_URL: { code: 'INVALID_IMAGE_URL', message: 'Provided image URL is invalid or inaccessible.' },
  GROQ_API_ERROR: { code: 'GROQ_API_ERROR', message: 'Groq API error occurred during verification.' },
  INVALID_JSON_RESPONSE: { code: 'INVALID_JSON_RESPONSE', message: 'AI response was not valid JSON format.' },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'An internal server error occurred.' }
};

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
  const systemErrorCodes = ['GROQ_API_ERROR', 'INVALID_JSON_RESPONSE', 'INTERNAL_ERROR'];
  if (errors.some(e => systemErrorCodes.includes(e.code))) {
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
  const criticalErrorCodes = [
    'MISSING_FULL_NAME', 
    'MISSING_IDENTITY_NUMBER', 
    'INVALID_IDENTITY_NUMBER',
    'EXPIRED_ID',
    'SPOOFING_DETECTED',
    'NO_FACE_DETECTED'
  ];
  
  if (errors.some(e => criticalErrorCodes.includes(e.code))) {
    return STATUS.REJECTED;
  }
  
  return STATUS.PENDING;
}
