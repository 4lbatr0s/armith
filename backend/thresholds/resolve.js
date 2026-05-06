import { KycConfigSchema } from '../src/schemas/config.schema.js';
export function resolveKycConfig(input) {
    return KycConfigSchema.parse(input);
}
