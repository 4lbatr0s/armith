import { CountryValidatorFactory } from './country-validator.factory.js';
import { AgeValidator } from './base/age.validator.js';
import { ExpiryValidator } from './base/expiry.validator.js';
import { evaluateIdThresholdErrors } from '../thresholds/evaluate.js';
import { ValidationError } from './country-validator.interface.js';
import { validateMrzAgainstExtraction } from './mrz-cross-validate.js';
export class IdCardPostProcessor {
    static validate(data, config) {
        const allErrors = [];
        // 1. Country-specific validation
        try {
            const countryValidator = CountryValidatorFactory.getValidator(config.countryCode);
            const countryResult = countryValidator.validateIdCard(data.extraction);
            allErrors.push(...countryResult.errors);
        }
        catch (error) {
            allErrors.push(new ValidationError('UNSUPPORTED_COUNTRY', error.message));
        }
        // 2. Age validation
        if (config.validationRules.enforceAgeCheck) {
            const ageResult = AgeValidator.validate(data.extraction.dateOfBirth, config.validationRules.minAge, config.validationRules.maxAge);
            allErrors.push(...ageResult.errors);
        }
        // 3. Expiry validation
        if (config.validationRules.enforceExpiryCheck) {
            const expiryResult = ExpiryValidator.validate(data.extraction.expiryDate, config.validationRules.expiryWarningDays);
            allErrors.push(...expiryResult.errors);
        }
        allErrors.push(...evaluateIdThresholdErrors(data, config));
        if (config.validationRules.enforceMrzCrossValidation && data.mrz?.parsed) {
            allErrors.push(...validateMrzAgainstExtraction(data.extraction ?? {}, data.mrz.parsed));
        }
        // 5. Hologram
        if (config.validationRules.requireHologramDetection && !data.authenticity?.hologramPresence) {
            allErrors.push(new ValidationError('MISSING_HOLOGRAM', 'Hologram could not be detected on the document.', 'authenticity', 'warning'));
        }
        return {
            isValid: !allErrors.some(e => e.severity === 'critical'),
            errors: allErrors
        };
    }
}
