import { KycConfigSchema } from '../schemas/config.schema.js';
export function resolveKycConfig(input) {
    return KycConfigSchema.parse(input);
}
