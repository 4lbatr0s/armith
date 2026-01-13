import { ValidationError, ValidationResult } from '../country-validator.interface.js';
import { ERRORS } from '../../../kyc/config.js';

export class AgeValidator {
    static validate(dob: string, minAge: number, maxAge: number): ValidationResult {
        const errors: ValidationError[] = [];

        if (!dob) {
            return { isValid: false, errors: [new ValidationError(ERRORS.MISSING_DOB.code, ERRORS.MISSING_DOB.message, 'dateOfBirth')] };
        }

        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) {
            return { isValid: false, errors: [new ValidationError(ERRORS.INVALID_DOB_FORMAT.code, ERRORS.INVALID_DOB_FORMAT.message, 'dateOfBirth')] };
        }

        const today = new Date();

        let age = today.getFullYear() - birthDate.getFullYear();

        const m = today.getMonth() - birthDate.getMonth();

        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < minAge || age > maxAge) {
            errors.push(new ValidationError(ERRORS.INVALID_AGE.code, `Age ${age} is outside the allowed range of ${minAge}-${maxAge}.`, 'dateOfBirth'));
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
