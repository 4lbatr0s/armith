import { ERROR_CODES } from './error-codes.js';
import { 
  ID_FIELDS, 
  SELFIE_FIELDS,
  ALL_GENDER_VALUES,
  ALL_DOCUMENT_CONDITION_VALUES,
  ALL_LIGHTING_CONDITION_VALUES,
  ALL_FACE_SIZE_VALUES,
  ALL_FACE_COVERAGE_VALUES,
  ALL_COUNTRY_CODE_VALUES
} from './constants/fieldNames.js';

/**
 * KYC Validation Rules Configuration
 * Contains only the rules and thresholds - no validation logic
 * Single Responsibility: Define validation criteria
 */
const KYC_VALIDATION_RULES = {
  // Turkish ID Card Rules
  TURKISH_ID: {
    // Fields that need normal validation (no thresholds)
    NORMAL_FIELDS: {
      [ID_FIELDS.FULL_NAME]: {
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-ZçğıöşüÇĞIİÖŞÜ\s]+$/,
        errorCode: ERROR_CODES.MISSING_FULL_NAME.code
      },
      [ID_FIELDS.IDENTITY_NUMBER]: {
        required: true,
        length: 11,
        pattern: /^\d{11}$/,
        checksumValidation: true,
        errorCode: ERROR_CODES.INVALID_IDENTITY_NUMBER.code
      },
      [ID_FIELDS.DATE_OF_BIRTH]: {
        required: true,
        format: 'YYYY-MM-DD',
        minAge: 18,
        maxAge: 120,
        errorCode: ERROR_CODES.MISSING_DOB.code
      },
      [ID_FIELDS.EXPIRY_DATE]: {
        required: true,
        format: 'YYYY-MM-DD',
        errorCode: ERROR_CODES.MISSING_EXPIRY_DATE.code
      },
      [ID_FIELDS.GENDER]: {
        required: true,
        allowedValues: ALL_GENDER_VALUES,
        errorCode: ERROR_CODES.MISSING_GENDER.code
      },
      [ID_FIELDS.NATIONALITY]: {
        required: true,
        expectedValue: 'TR',
        errorCode: ERROR_CODES.MISSING_NATIONALITY.code
      },
      [ID_FIELDS.SERIAL_NUMBER]: {
        required: true,
        minLength: 3,
        maxLength: 20,
        errorCode: ERROR_CODES.MISSING_SERIAL_NUMBER.code
      },
      // Additional validations
      [ID_FIELDS.DOCUMENT_CONDITION]: {
        allowedValues: ALL_DOCUMENT_CONDITION_VALUES,
        errorCode: ERROR_CODES.DAMAGED_ID.code
      },
      [ID_FIELDS.COUNTRY_CODE]: {
        required: true,
        allowedValues: ALL_COUNTRY_CODE_VALUES,
        errorCode: ERROR_CODES.UNSUPPORTED_COUNTRY.code
      }
    },
    
    // Fields that need threshold validation
    THRESHOLD_FIELDS: {
      [ID_FIELDS.FULL_NAME_CONFIDENCE]: {
        threshold: 0.8,
        errorCode: ERROR_CODES.MISSING_FULL_NAME.code
      },
      [ID_FIELDS.IDENTITY_NUMBER_CONFIDENCE]: {
        threshold: 0.95,
        errorCode: ERROR_CODES.MISSING_IDENTITY_NUMBER.code
      },
      [ID_FIELDS.DATE_OF_BIRTH_CONFIDENCE]: {
        threshold: 0.9,
        errorCode: ERROR_CODES.MISSING_DOB.code
      },
      [ID_FIELDS.EXPIRY_DATE_CONFIDENCE]: {
        threshold: 0.9,
        errorCode: ERROR_CODES.MISSING_EXPIRY_DATE.code
      },
      [ID_FIELDS.IMAGE_QUALITY]: {
        threshold: 0.7,
        errorCode: ERROR_CODES.BLURRY_IMAGE.code
      }
    }
  },
  
  // Selfie Rules
  SELFIE: {
    // Fields that need threshold validation
    THRESHOLD_FIELDS: {
      [SELFIE_FIELDS.MATCH_CONFIDENCE]: {
        threshold: 80, // Percentage
        errorCode: ERROR_CODES.LOW_MATCH_CONFIDENCE.code
      },
      [SELFIE_FIELDS.IMAGE_QUALITY]: {
        threshold: 0.7,
        errorCode: ERROR_CODES.POOR_IMAGE_QUALITY.code
      },
      [SELFIE_FIELDS.FACE_DETECTION_CONFIDENCE]: {
        threshold: 0.8,
        errorCode: ERROR_CODES.NO_FACE_DETECTED.code
      }
    },
    
    // Fields that need normal validation
    NORMAL_FIELDS: {
      [SELFIE_FIELDS.SPOOFING_RISK]: {
        maxValue: 0.3,
        errorCode: ERROR_CODES.SPOOFING_DETECTED.code
      },
      [SELFIE_FIELDS.FACE_COUNT]: {
        expectedValue: 1,
        errorCode: ERROR_CODES.MULTIPLE_FACES.code
      },
      // Additional selfie validations
      [SELFIE_FIELDS.LIGHTING_CONDITION]: {
        allowedValues: ALL_LIGHTING_CONDITION_VALUES,
        errorCode: ERROR_CODES.INSUFFICIENT_LIGHTING.code
      },
      [SELFIE_FIELDS.FACE_SIZE]: {
        allowedValues: ALL_FACE_SIZE_VALUES,
        errorCode: ERROR_CODES.FACE_TOO_SMALL.code
      },
      [SELFIE_FIELDS.FACE_COVERAGE]: {
        allowedValues: ALL_FACE_COVERAGE_VALUES,
        errorCode: ERROR_CODES.FACE_PARTIALLY_COVERED.code
      }
    }
  }
};

export { KYC_VALIDATION_RULES };
