import { KYC_VALIDATION_RULES } from '../kycValidationRules.js';
import { createError, ERROR_CODES } from '../error-codes.js';
import { 
  ID_NORMAL_FIELDS, 
  ID_THRESHOLD_FIELDS, 
  SELFIE_NORMAL_FIELDS, 
  SELFIE_THRESHOLD_FIELDS,
  ID_FIELDS,
  SELFIE_FIELDS
} from '../constants/fieldNames.js';

/**
 * KYC Validator Service
 * Single Responsibility: Perform validation using the rules
 * Separated from the rules configuration for clean architecture
 */
class KycValidatorService {
  
  /**
   * Validate normal fields (no thresholds)
   * @param {any} value - Value to validate
   * @param {string} fieldName - Name of the field
   * @param {string} category - Category (TURKISH_ID or SELFIE)
   * @returns {Object} Validation result
   */
  validateNormalField(value, fieldName, category = 'TURKISH_ID') {
    const rule = KYC_VALIDATION_RULES[category].NORMAL_FIELDS[fieldName];
    if (!rule) {
      return { valid: true };
    }

    // Required check
    if (rule.required && (!value || value.toString().trim() === '')) {
      return { valid: false, errorCode: rule.errorCode };
    }

    // Length checks
    if (rule.minLength && value.length < rule.minLength) {
      return { valid: false, errorCode: rule.errorCode };
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return { valid: false, errorCode: rule.errorCode };
    }
    if (rule.length && value.length !== rule.length) {
      return { valid: false, errorCode: rule.errorCode };
    }

    // Pattern check
    if (rule.pattern && !rule.pattern.test(value)) {
      return { valid: false, errorCode: rule.errorCode };
    }

    // Expected value check
    if (rule.expectedValue && value !== rule.expectedValue) {
      return { valid: false, errorCode: rule.errorCode };
    }

    // Allowed values check
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      return { valid: false, errorCode: rule.errorCode };
    }

    // Max value check
    if (rule.maxValue && value > rule.maxValue) {
      return { valid: false, errorCode: rule.errorCode };
    }

    // Special validations
    if (fieldName === ID_FIELDS.IDENTITY_NUMBER && rule.checksumValidation) {
      return this._validateTurkishIdChecksum(value);
    }

    if (fieldName === ID_FIELDS.DATE_OF_BIRTH || fieldName === ID_FIELDS.EXPIRY_DATE) {
      return this._validateDate(value, fieldName);
    }

    return { valid: true };
  }

  /**
   * Validate threshold fields
   * @param {number} confidence - Confidence value to validate
   * @param {string} fieldName - Name of the field
   * @param {string} category - Category (TURKISH_ID or SELFIE)
   * @returns {Object} Validation result
   */
  validateThreshold(confidence, fieldName, category = 'TURKISH_ID') {
    const rule = KYC_VALIDATION_RULES[category].THRESHOLD_FIELDS[fieldName];
    
    if (!rule) {
      return { valid: true };
    }


    if (confidence < rule.threshold) {
      return { valid: false, errorCode: rule.errorCode };
    }

    return { valid: true };
  }

  /**
   * Validate Turkish ID document data
   * @param {Object} data - The extracted ID data
   * @returns {Object} Validation result with errors
   */
  validateIdData(data) {
    const errors = [];
    
    // Validate normal fields
    ID_NORMAL_FIELDS.forEach(field => {
      if (data[field] !== undefined) {
        const validation = this.validateNormalField(data[field], field, 'TURKISH_ID');
        if (!validation.valid) {
          errors.push(createError(validation.errorCode));
        }
      }
    });
    
    // Special validation for expired ID
    if (data[ID_FIELDS.EXPIRY_DATE]) {
      const expiryDate = new Date(data[ID_FIELDS.EXPIRY_DATE]);
      const today = new Date();
      if (expiryDate < today) {
        errors.push(createError(ERROR_CODES.EXPIRED_ID.code));
      }
    }
    
    // Validate threshold fields
    ID_THRESHOLD_FIELDS.forEach(field => {
      if (data[field] !== undefined) {
        const validation = this.validateThreshold(data[field], field, 'TURKISH_ID');
        if (!validation.valid) {
          errors.push(createError(validation.errorCode));
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate selfie data
   * @param {Object} data - The extracted selfie data
   * @returns {Object} Validation result with errors
   */
  validateSelfieData(data) {
    const errors = [];
    
    // Validate normal fields
    SELFIE_NORMAL_FIELDS.forEach(field => {
      if (data[field] !== undefined) {
        const validation = this.validateNormalField(data[field], field, 'SELFIE');
        if (!validation.valid) {
          errors.push(createError(validation.errorCode));
        }
      }
    });
    
    // Validate threshold fields
    SELFIE_THRESHOLD_FIELDS.forEach(field => {
      if (data[field] !== undefined) {
        const validation = this.validateThreshold(data[field], field, 'SELFIE');
        if (!validation.valid) {
          errors.push(createError(validation.errorCode));
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Private helper methods
  _validateTurkishIdChecksum(idNumber) {
    if (!idNumber || !/^\d{11}$/.test(idNumber)) {
      return { valid: false, errorCode: ERROR_CODES.INVALID_IDENTITY_NUMBER.code };
    }

    const digits = idNumber.split('').map(Number);
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
    const checkDigit1 = (oddSum * 7 - evenSum) % 10;
    const checkDigit2 = (oddSum + evenSum + checkDigit1) % 10;

    if (digits[9] !== checkDigit1 || digits[10] !== checkDigit2) {
      return { valid: false, errorCode: ERROR_CODES.INVALID_IDENTITY_NUMBER.code };
    }

    return { valid: true };
  }

  _validateDate(dateString, fieldName) {
    const date = new Date(dateString);
    const now = new Date();

    if (isNaN(date.getTime())) {
      return { 
        valid: false, 
        errorCode: fieldName === ID_FIELDS.DATE_OF_BIRTH ? ERROR_CODES.INVALID_DOB_FORMAT.code : ERROR_CODES.INVALID_EXPIRY_FORMAT.code
      };
    }

    if (fieldName === ID_FIELDS.DATE_OF_BIRTH) {
      const age = now.getFullYear() - date.getFullYear();
      if (age < 18 || age > 120 || date > now) {
        return { valid: false, errorCode: ERROR_CODES.INVALID_DOB_LOGIC.code };
      }
    }

    if (fieldName === ID_FIELDS.EXPIRY_DATE) {
      const daysDiff = (date - now) / (1000 * 60 * 60 * 24);
      if (daysDiff < -365) { // More than 1 year expired
        return { valid: false, errorCode: ERROR_CODES.EXPIRED_DOCUMENT.code };
      }
    }

    return { valid: true };
  }
}

// Export singleton instance
const kycValidatorService = new KycValidatorService();

export { KycValidatorService, kycValidatorService };
