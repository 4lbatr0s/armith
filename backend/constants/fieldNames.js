/**
 * Field Name Constants
 * Centralized field names used across the KYC system
 * Prevents typos and ensures consistency
 */

// ID Document Fields
export const ID_FIELDS = {
  // Basic extraction fields
  FULL_NAME: 'fullName',
  IDENTITY_NUMBER: 'identityNumber',
  DATE_OF_BIRTH: 'dateOfBirth',
  EXPIRY_DATE: 'expiryDate',
  GENDER: 'gender',
  NATIONALITY: 'nationality',
  SERIAL_NUMBER: 'serialNumber',
  MRZ: 'mrz',
  ADDRESS: 'address',
  
  // Assessment fields (for LLM to fill)
  DOCUMENT_CONDITION: 'documentCondition',
  COUNTRY_CODE: 'countryCode',
  
  // Confidence fields
  FULL_NAME_CONFIDENCE: 'fullNameConfidence',
  IDENTITY_NUMBER_CONFIDENCE: 'identityNumberConfidence',
  DATE_OF_BIRTH_CONFIDENCE: 'dateOfBirthConfidence',
  EXPIRY_DATE_CONFIDENCE: 'expiryDateConfidence',
  IMAGE_QUALITY: 'imageQuality',
  
  // System fields
  ERRORS: 'errors'
};

// Selfie Fields
export const SELFIE_FIELDS = {
  // Basic fields
  IS_MATCH: 'isMatch',
  SPOOFING_RISK: 'spoofingRisk',
  FACE_COUNT: 'faceCount',
  IMAGE_QUALITY_ISSUES: 'imageQualityIssues',
  
  // Assessment fields (for LLM to fill)
  LIGHTING_CONDITION: 'lightingCondition',
  FACE_SIZE: 'faceSize',
  FACE_COVERAGE: 'faceCoverage',
  
  // Confidence fields
  MATCH_CONFIDENCE: 'matchConfidence',
  IMAGE_QUALITY: 'imageQuality',
  FACE_DETECTION_CONFIDENCE: 'faceDetectionConfidence',
  
  // System fields
  ERRORS: 'errors',
  REJECTION_REASONS: 'rejectionReasons'
};

// Field Categories for Validation
export const ID_NORMAL_FIELDS = [
  ID_FIELDS.FULL_NAME,
  ID_FIELDS.IDENTITY_NUMBER,
  ID_FIELDS.DATE_OF_BIRTH,
  ID_FIELDS.EXPIRY_DATE,
  ID_FIELDS.GENDER,
  ID_FIELDS.NATIONALITY,
  ID_FIELDS.SERIAL_NUMBER,
  ID_FIELDS.DOCUMENT_CONDITION,
  ID_FIELDS.COUNTRY_CODE
];

export const ID_THRESHOLD_FIELDS = [
  ID_FIELDS.FULL_NAME_CONFIDENCE,
  ID_FIELDS.IDENTITY_NUMBER_CONFIDENCE,
  ID_FIELDS.DATE_OF_BIRTH_CONFIDENCE,
  ID_FIELDS.EXPIRY_DATE_CONFIDENCE,
  ID_FIELDS.IMAGE_QUALITY
];

export const SELFIE_NORMAL_FIELDS = [
  SELFIE_FIELDS.SPOOFING_RISK,
  SELFIE_FIELDS.FACE_COUNT,
  SELFIE_FIELDS.LIGHTING_CONDITION,
  SELFIE_FIELDS.FACE_SIZE,
  SELFIE_FIELDS.FACE_COVERAGE
];

export const SELFIE_THRESHOLD_FIELDS = [
  SELFIE_FIELDS.MATCH_CONFIDENCE,
  SELFIE_FIELDS.IMAGE_QUALITY,
  SELFIE_FIELDS.FACE_DETECTION_CONFIDENCE
];

// Document Condition Values
export const DOCUMENT_CONDITION_VALUES = {
  GOOD: 'good',
  DAMAGED: 'damaged',
  POOR: 'poor'
};

// Country Code Values
export const COUNTRY_CODE_VALUES = {
  TURKEY: 'tr',
  US: 'us',
  UK: 'gb'
};

// Lighting Condition Values
export const LIGHTING_CONDITION_VALUES = {
  GOOD: 'good',
  POOR: 'poor',
  INSUFFICIENT: 'insufficient'
};

// Face Size Values
export const FACE_SIZE_VALUES = {
  ADEQUATE: 'adequate',
  TOO_SMALL: 'too_small',
  TOO_LARGE: 'too_large'
};

// Face Coverage Values
export const FACE_COVERAGE_VALUES = {
  CLEAR: 'clear',
  PARTIALLY_COVERED: 'partially_covered',
  FULLY_COVERED: 'fully_covered'
};

// Gender Values
export const GENDER_VALUES = {
  MALE: 'M',
  FEMALE: 'F',
  MALE_TURKISH: 'Male',
  FEMALE_TURKISH: 'Female',
  MALE_TURKISH_ALT: 'Erkek',
  FEMALE_TURKISH_ALT: 'Kadın'
};

// All Gender Values Array
export const ALL_GENDER_VALUES = Object.values(GENDER_VALUES);

// All Document Condition Values Array
export const ALL_DOCUMENT_CONDITION_VALUES = Object.values(DOCUMENT_CONDITION_VALUES);

// All Lighting Condition Values Array
export const ALL_LIGHTING_CONDITION_VALUES = Object.values(LIGHTING_CONDITION_VALUES);

// All Face Size Values Array
export const ALL_FACE_SIZE_VALUES = Object.values(FACE_SIZE_VALUES);

// All Face Coverage Values Array
export const ALL_FACE_COVERAGE_VALUES = Object.values(FACE_COVERAGE_VALUES);

// All Country Code Values Array
export const ALL_COUNTRY_CODE_VALUES = Object.values(COUNTRY_CODE_VALUES);
