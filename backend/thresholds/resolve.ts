import { KycConfigSchema } from '../src/schemas/config.schema.js';

export type KycConfigParsed = ReturnType<(typeof KycConfigSchema)['parse']>;

export function resolveKycConfig(input: unknown): KycConfigParsed {
    return KycConfigSchema.parse(input);
}
