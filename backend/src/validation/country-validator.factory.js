import { TurkishValidator } from './countries/turkish.validator.js';
import { GermanValidator } from './countries/german.validator.js';
import { UkValidator } from './countries/uk.validator.js';
export class CountryValidatorFactory {
    static validators = new Map([
        ['TR', new TurkishValidator()],
        ['DE', new GermanValidator()],
        ['GB', new UkValidator()]
    ]);
    static getValidator(countryCode) {
        const validator = this.validators.get(countryCode.toUpperCase());
        if (!validator) {
            throw new Error(`Unsupported country: ${countryCode}`);
        }
        return validator;
    }
    static getSupportedCountries() {
        return Array.from(this.validators.keys());
    }
}
