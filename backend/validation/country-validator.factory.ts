import { CountryValidator } from './country-validator.interface.js';
import { TurkishValidator } from './countries/turkish.validator.js';
import { GermanValidator } from './countries/german.validator.js';
import { UkValidator } from './countries/uk.validator.js';

export class CountryValidatorFactory {
    private static validators: Map<string, CountryValidator> = new Map([
        ['TR', new TurkishValidator()],
        ['DE', new GermanValidator()],
        ['GB', new UkValidator()]
    ]);

    static getValidator(countryCode: string): CountryValidator {
        const validator = this.validators.get(countryCode.toUpperCase());
        if (!validator) {
            throw new Error(`Unsupported country: ${countryCode}`);
        }
        return validator;
    }

    static getSupportedCountries(): string[] {
        return Array.from(this.validators.keys());
    }
}
