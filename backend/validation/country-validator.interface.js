export class ValidationError {
    code;
    message;
    field;
    severity;
    constructor(code, message, field, severity = 'critical') {
        this.code = code;
        this.message = message;
        this.field = field;
        this.severity = severity;
    }
}
