import { ValidationError, ValidationResult } from '../country-validator.interface.js';
import { ERRORS } from '../../../kyc/config.js';

export class ConfidenceValidator {
    static validate(field: string, score: number, threshold: number): ValidationResult {
        const errors: ValidationError[] = [];

        if (score < threshold) {
            errors.push(new ValidationError(
                ERRORS.LOW_CONFIDENCE.code,
                `Confidence score for ${field} (${(score * 100).toFixed(1)}%) is below threshold (${(threshold * 100).toFixed(1)}%).`,
                field,
                score < (threshold - 0.2) ? 'critical' : 'warning'
            ));
        }

        return {
            isValid: !errors.some(e => e.severity === 'critical'),
            errors
        };
    }
}
