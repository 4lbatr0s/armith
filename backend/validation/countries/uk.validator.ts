import { CountryValidator, ValidationResult, ValidationError } from '../country-validator.interface.js';

export class UkValidator implements CountryValidator {
    getCountryCode(): string {
        return 'GB';
    }

    validateIdCard(data: any): ValidationResult {
        const errors: ValidationError[] = [];

        // UK documents often vary but usually have these fields
        const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'identityNumber'];

        for (const field of requiredFields) {
            if (!data[field]) {
                const errorCode = field === 'firstName' ? 'MISSING_FIRST_NAME' :
                    field === 'lastName' ? 'MISSING_LAST_NAME' :
                        `MISSING_${field.toUpperCase()}`;
                errors.push(new ValidationError(errorCode, `UK documents must have ${field}.`, field, 'critical'));
            }
        }

        // Add a warning that full algorithmic validation is pending
        errors.push(new ValidationError('PARTIAL_IMPLEMENTATION', 'UK document validation is partially implemented (existence checks only).', undefined, 'info'));

        return {
            isValid: errors.filter(e => e.severity === 'critical').length === 0,
            errors
        };
    }
}
