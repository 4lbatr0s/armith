export class ValidationError {
    constructor(
        public code: string | number,
        public message: string,
        public field?: string,
        public severity: 'critical' | 'warning' | 'info' = 'critical'
    ) { }
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface CountryValidator {
    validateIdCard(data: any): ValidationResult;
    getCountryCode(): string;
}
