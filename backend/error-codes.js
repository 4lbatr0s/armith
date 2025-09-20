// Error code registry for KYC validation
const ERROR_CODES = {
  // ID Verification Errors
  MISSING_FULL_NAME: {
    code: 'MISSING_FULL_NAME',
    numericCode: 1001,
    message: 'Full name could not be detected on ID card.'
  },
  MISSING_IDENTITY_NUMBER: {
    code: 'MISSING_IDENTITY_NUMBER',
    numericCode: 1002,
    message: 'Identity number could not be detected on ID card.'
  },
  MISSING_DOB: {
    code: 'MISSING_DOB',
    numericCode: 1003,
    message: 'Date of birth could not be detected on ID card.'
  },
  INVALID_DOB_FORMAT: {
    code: 'INVALID_DOB_FORMAT',
    numericCode: 1004,
    message: 'Date of birth format is invalid. Expected YYYY-MM-DD.'
  },
  MISSING_EXPIRY_DATE: {
    code: 'MISSING_EXPIRY_DATE',
    numericCode: 1005,
    message: 'Expiry date could not be detected on ID card.'
  },
  INVALID_EXPIRY_FORMAT: {
    code: 'INVALID_EXPIRY_FORMAT',
    numericCode: 1006,
    message: 'Expiry date format is invalid. Expected YYYY-MM-DD.'
  },
  EXPIRED_ID: {
    code: 'EXPIRED_ID',
    numericCode: 1007,
    message: 'ID card has expired.'
  },
  MISSING_GENDER: {
    code: 'MISSING_GENDER',
    numericCode: 1008,
    message: 'Gender could not be detected on ID card.'
  },
  MISSING_NATIONALITY: {
    code: 'MISSING_NATIONALITY',
    numericCode: 1009,
    message: 'Nationality could not be detected on ID card.'
  },
  MISSING_SERIAL_NUMBER: {
    code: 'MISSING_SERIAL_NUMBER',
    numericCode: 1010,
    message: 'Serial number could not be detected on ID card.'
  },
  BLURRY_IMAGE: {
    code: 'BLURRY_IMAGE',
    numericCode: 1011,
    message: 'ID card image is too blurry to read clearly.'
  },
  DAMAGED_ID: {
    code: 'DAMAGED_ID',
    numericCode: 1012,
    message: 'ID card appears to be damaged or corrupted.'
  },
  WRONG_CONTENT: {
    code: 'WRONG_CONTENT',
    numericCode: 1013,
    message: 'Uploaded image does not contain a valid ID card document.'
  },
  UNSUPPORTED_COUNTRY: {
    code: 'UNSUPPORTED_COUNTRY',
    numericCode: 1014,
    message: 'Country code is not supported for ID verification.'
  },
  INVALID_IDENTITY_NUMBER: {
    code: 'INVALID_IDENTITY_NUMBER',
    numericCode: 1015,
    message: 'Identity number format or checksum is invalid.'
  },
  INVALID_DOB_LOGIC: {
    code: 'INVALID_DOB_LOGIC',
    numericCode: 1016,
    message: 'Date of birth logic is invalid (age constraints).'
  },
  INVALID_EXPIRY_LOGIC: {
    code: 'INVALID_EXPIRY_LOGIC',
    numericCode: 1017,
    message: 'Expiry date logic is invalid (date constraints).'
  },
  INVALID_CHARSET: {
    code: 'INVALID_CHARSET',
    numericCode: 1018,
    message: 'Document contains invalid characters for the expected language.'
  },
  EXPIRED_DOCUMENT: {
    code: 'EXPIRED_DOCUMENT',
    numericCode: 1019,
    message: 'Document has expired.'
  },
  MULTIPLE_DOCUMENTS_DETECTED: {
    code: 'MULTIPLE_DOCUMENTS_DETECTED',
    numericCode: 1020,
    message: 'Multiple documents detected in the image.'
  },
  
  // Selfie Verification Errors
  LOW_MATCH_CONFIDENCE: {
    code: 'LOW_MATCH_CONFIDENCE',
    numericCode: 2001,
    message: 'Face match confidence is below acceptable threshold.'
  },
  NO_FACE_DETECTED: {
    code: 'NO_FACE_DETECTED',
    numericCode: 2002,
    message: 'No face could be detected in the provided image.'
  },
  MULTIPLE_FACES: {
    code: 'MULTIPLE_FACES',
    numericCode: 2003,
    message: 'Multiple faces detected in image. Please provide a single-person selfie.'
  },
  POOR_IMAGE_QUALITY: {
    code: 'POOR_IMAGE_QUALITY',
    numericCode: 2004,
    message: 'Image quality is too poor for accurate verification.'
  },
  SPOOFING_DETECTED: {
    code: 'SPOOFING_DETECTED',
    numericCode: 2005,
    message: 'Potential spoofing or fake image detected.'
  },
  INSUFFICIENT_LIGHTING: {
    code: 'INSUFFICIENT_LIGHTING',
    numericCode: 2006,
    message: 'Image lighting is insufficient for accurate verification.'
  },
  FACE_TOO_SMALL: {
    code: 'FACE_TOO_SMALL',
    numericCode: 2007,
    message: 'Face in image is too small for accurate verification.'
  },
  FACE_PARTIALLY_COVERED: {
    code: 'FACE_PARTIALLY_COVERED',
    numericCode: 2008,
    message: 'Face is partially covered or obscured.'
  },
  
  // System Errors
  INVALID_IMAGE_URL: {
    code: 'INVALID_IMAGE_URL',
    numericCode: 3001,
    message: 'Provided image URL is invalid or inaccessible.'
  },
  GROQ_API_ERROR: {
    code: 'GROQ_API_ERROR',
    numericCode: 3002,
    message: 'Groq API error occurred during verification.'
  },
  INVALID_JSON_RESPONSE: {
    code: 'INVALID_JSON_RESPONSE',
    numericCode: 3003,
    message: 'AI response was not valid JSON format.'
  },
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    numericCode: 3004,
    message: 'Rate limit exceeded. Please try again later.'
  },
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    numericCode: 3005,
    message: 'An internal server error occurred.'
  }
};

// Status definitions
const STATUS_TYPES = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FAILED: 'failed',
  PENDING: 'pending'
};

// Helper function to create error objects
const createError = (errorCode, customMessage = null) => {
  const error = ERROR_CODES[errorCode];
  if (!error) {
    throw new Error(`Unknown error code: ${errorCode}`);
  }
  
  return {
    code: error.code,
    numericCode: error.numericCode,
    message: customMessage || error.message
  };
};

// Helper function to determine status based on errors
const determineStatus = (errors, isMatch = null, confidence = null) => {
  if (errors.length === 0) {
    return STATUS_TYPES.APPROVED;
  }
  
  // Check for system failures
  const systemErrors = ['GROQ_API_ERROR', 'INVALID_JSON_RESPONSE', 'INTERNAL_SERVER_ERROR'];
  if (errors.some(error => systemErrors.includes(error.code))) {
    return STATUS_TYPES.FAILED;
  }
  
  // For selfie checks, consider match confidence
  if (isMatch !== null && confidence !== null) {
    if (isMatch && parseInt(confidence) >= 80) {
      return STATUS_TYPES.APPROVED;
    }
    return STATUS_TYPES.REJECTED;
  }
  
  // For ID checks, reject if critical fields are missing
  const criticalErrors = ['MISSING_FULL_NAME', 'MISSING_IDENTITY_NUMBER', 'EXPIRED_ID'];
  if (errors.some(error => criticalErrors.includes(error.code))) {
    return STATUS_TYPES.REJECTED;
  }
  
  return STATUS_TYPES.PENDING;
};

export {
  ERROR_CODES,
  STATUS_TYPES,
  createError,
  determineStatus
}; 