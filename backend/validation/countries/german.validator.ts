import { CountryValidator, ValidationResult, ValidationError } from '../country-validator.interface.js';

export class GermanValidator implements CountryValidator {
    getCountryCode(): string {
        return 'DE';
    }

    validateIdCard(data: any): ValidationResult {
        const errors: ValidationError[] = [];

        // German ID cards have specific fields we can check for existence
        const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'identityNumber', 'nationality'];

        for (const field of requiredFields) {
            if (!data[field]) {
                const errorCode = field === 'firstName' ? 'MISSING_FIRST_NAME' :
                    field === 'lastName' ? 'MISSING_LAST_NAME' :
                        `MISSING_${field.toUpperCase()}`;
                errors.push(new ValidationError(errorCode, `German ID cards must have ${field}.`, field, 'critical'));
            }
        }

        // Add a warning that full algorithmic validation is pending
        errors.push(new ValidationError('PARTIAL_IMPLEMENTATION', 'German ID validation is partially implemented (existence checks only).', undefined, 'info'));

        return {
            isValid: errors.filter(e => e.severity === 'critical').length === 0,
            errors
        };
    }
}
