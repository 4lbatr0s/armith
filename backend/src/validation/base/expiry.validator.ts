import { ValidationError, ValidationResult } from '../country-validator.interface.js';
import { ERRORS } from '../../../kyc/config.js';

export class ExpiryValidator {
    static validate(expiryDate: string, warningDays: number = 30): ValidationResult {
        const errors: ValidationError[] = [];

        if (!expiryDate) {
            return { isValid: false, errors: [new ValidationError(ERRORS.MISSING_EXPIRY_DATE.code, ERRORS.MISSING_EXPIRY_DATE.message, 'expiryDate')] };
        }

        const expiry = new Date(expiryDate);
        if (isNaN(expiry.getTime())) {
            return { isValid: false, errors: [new ValidationError(ERRORS.INVALID_EXPIRY_FORMAT.code, ERRORS.INVALID_EXPIRY_FORMAT.message, 'expiryDate')] };
        }

        const today = new Date();
        if (expiry < today) {
            errors.push(new ValidationError(ERRORS.EXPIRED_DOCUMENT.code, ERRORS.EXPIRED_DOCUMENT.message, 'expiryDate'));
        } else {
            const diffTime = Math.abs(expiry.getTime() - today.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= warningDays) {
                errors.push(new ValidationError(ERRORS.EXPIRY_WARNING.code, `Document will expire in ${diffDays} days.`, 'expiryDate', 'warning'));
            }
        }

        return {
            isValid: !errors.some(e => e.severity === 'critical'),
            errors
        };
    }
}
