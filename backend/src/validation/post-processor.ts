import { CountryValidatorFactory } from './country-validator.factory.js';
import { AgeValidator } from './base/age.validator.js';
import { ExpiryValidator } from './base/expiry.validator.js';
import { ConfidenceValidator } from './base/confidence.validator.js';
import { ValidationError, ValidationResult } from './country-validator.interface.js';

export class IdCardPostProcessor {
    static validate(data: any, config: any): ValidationResult {
        const allErrors: ValidationError[] = [];

        // 1. Country-specific validation
        try {
            const countryValidator = CountryValidatorFactory.getValidator(config.countryCode);
            const countryResult = countryValidator.validateIdCard(data.extraction);
            allErrors.push(...countryResult.errors);
        } catch (error: any) {
            allErrors.push(new ValidationError('UNSUPPORTED_COUNTRY', error.message));
        }

        // 2. Age validation
        if (config.validationRules.enforceAgeCheck) {
            const ageResult = AgeValidator.validate(
                data.extraction.dateOfBirth,
                config.validationRules.minAge,
                config.validationRules.maxAge
            );
            allErrors.push(...ageResult.errors);
        }

        // 3. Expiry validation
        if (config.validationRules.enforceExpiryCheck) {
            const expiryResult = ExpiryValidator.validate(
                data.extraction.expiryDate,
                config.validationRules.expiryWarningDays
            );
            allErrors.push(...expiryResult.errors);
        }

        // 4. Confidence validations
        const confidenceThresholds = config.idCardThresholds;
        const scores = data.confidence;

        if (scores) {
            const confidenceChecks = [
                { field: 'firstName', score: scores.firstNameConfidence, threshold: confidenceThresholds.minFullNameConfidence },
                { field: 'lastName', score: scores.lastNameConfidence, threshold: confidenceThresholds.minFullNameConfidence },
                { field: 'identityNumber', score: scores.identityNumberConfidence, threshold: confidenceThresholds.minIdentityNumberConfidence },
                { field: 'dateOfBirth', score: scores.dateOfBirthConfidence, threshold: confidenceThresholds.minDateOfBirthConfidence },
                { field: 'expiryDate', score: scores.expiryDateConfidence, threshold: confidenceThresholds.minExpiryDateConfidence },
            ];

            for (const check of confidenceChecks) {
                if (check.score !== undefined) {
                    const res = ConfidenceValidator.validate(check.field, check.score, check.threshold);
                    allErrors.push(...res.errors);
                }
            }
        }

        // 5. Document condition
        const condition = data.authenticity?.documentCondition;
        if (condition && !config.idCardThresholds.acceptableDocumentConditions.includes(condition.toLowerCase())) {
            allErrors.push(new ValidationError('POOR_DOCUMENT_CONDITION', `Document condition '${condition}' is not acceptable.`, 'documentCondition'));
        }

        // 6. Hologram
        if (config.validationRules.requireHologramDetection && !data.authenticity?.hologramPresence) {
            allErrors.push(new ValidationError('MISSING_HOLOGRAM', 'Hologram could not be detected on the document.', 'authenticity', 'warning'));
        }

        return {
            isValid: !allErrors.some(e => e.severity === 'critical'),
            errors: allErrors
        };
    }
}
