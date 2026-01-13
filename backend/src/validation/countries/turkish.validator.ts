import { CountryValidator, ValidationResult, ValidationError } from '../country-validator.interface.js';
import { ERRORS } from '../../../kyc/config.js';

export class TurkishValidator implements CountryValidator {
    getCountryCode(): string {
        return 'TR';
    }

    validateIdCard(data: any): ValidationResult {
        const errors: ValidationError[] = [];

        // TC Kimlik Number Validation
        if (data.identityNumber) {
            if (!this.validateTcKimlik(data.identityNumber)) {
                errors.push(new ValidationError(ERRORS.INVALID_IDENTITY_NUMBER.code, ERRORS.INVALID_IDENTITY_NUMBER.message, 'identityNumber'));
            }
        }

        // Name format validation
        if (!data.firstName || data.firstName.trim().length === 0) {
            errors.push(new ValidationError(ERRORS.MISSING_FIRST_NAME.code, ERRORS.MISSING_FIRST_NAME.message, 'firstName'));
        }
        if (!data.lastName || data.lastName.trim().length === 0) {
            errors.push(new ValidationError(ERRORS.MISSING_LAST_NAME.code, ERRORS.MISSING_LAST_NAME.message, 'lastName'));
        }

        // MRZ length check (Turkish ID cards usually have TD1 format MRZ with 3 lines of 30 chars)
        if (data.mrz && data.mrz.length > 0) {
            // Just a simple check as an example
            const lines = data.mrz.split('\n').filter((l: string) => l.trim().length > 0);
            if (lines.length !== 3 || lines[0].length !== 30) {
                errors.push(new ValidationError('INVALID_MRZ_FORMAT', 'Turkish ID card MRZ format is invalid.', 'mrz', 'warning'));
            }
        }

        return {
            isValid: errors.filter(e => e.severity === 'critical').length === 0,
            errors
        };
    }

    private validateTcKimlik(tcNo: string): boolean {
        if (!/^\d{11}$/.test(tcNo)) return false;
        if (tcNo[0] === '0') return false;

        const digits = tcNo.split('').map(Number);

        // 10th digit
        const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
        const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
        const checkDigit1 = ((oddSum * 7) - evenSum) % 10;
        const normalizedCheck1 = checkDigit1 < 0 ? checkDigit1 + 10 : checkDigit1;

        if (digits[9] !== normalizedCheck1) return false;

        // 11th digit
        const sumFirst10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
        const checkDigit2 = sumFirst10 % 10;

        if (digits[10] !== checkDigit2) return false;

        return true;
    }
}
