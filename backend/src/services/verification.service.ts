import Groq from 'groq-sdk';
import { generateIdCardPrompt, generateSelfiePrompt } from '../../prompts/load-prompt.js';
import { IdCardPostProcessor } from '../validation/post-processor.js';
import { KycConfigSchema } from '../schemas/config.schema.js';
import {
    IdVerificationSchema,
    ID_VERIFICATION_SCHEMA,
    SelfieVerificationSchema,
    SELFIE_VERIFICATION_SCHEMA
} from '../../kyc/schemas.js';
import logger from '../../lib/logger.js';
import { STATUS, ERRORS, determineStatus } from '../../kyc/config.js';
import { evaluateSelfieRules } from '../../thresholds/evaluate.js';
import { resolveKycConfig } from '../../thresholds/resolve.js';
import { applyFakeDataPenalties } from '../../thresholds/apply-fake-data-penalties.js';
import type { ValidationError } from '../validation/country-validator.interface.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEMPERATURE = 0.1;
const MAX_TOKENS = 2000;

function parseJsonContent(content: string | null | undefined): unknown {
    if (!content) return null;
    try {
        return JSON.parse(content);
    } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch {
                return null;
            }
        }
        return null;
    }
}

function mergeIdValidationErrors(a: ValidationError[], b: ValidationError[]) {
    const seen = new Set<string>();
    const out: ValidationError[] = [];
    for (const e of [...a, ...b]) {
        const k = `${e.code}-${e.field ?? ''}-${e.message}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(e);
    }
    return out;
}

function dedupeErrorsByCode(errors: Array<Record<string, unknown>>) {
    const seen = new Set<string>();
    return errors.filter(e => {
        const key =
            e?.code !== undefined && e?.code !== null
                ? String(e.code)
                : `${e.message ?? ''}:${e.field ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function normalizeSelfiePayload(data: Record<string, any>) {
    const lcRaw = data.liveness?.livenessConfidence;
    const lcParsed = lcRaw === null || lcRaw === undefined ? NaN : parseFloat(String(lcRaw));
    const livenessConfidence = Number.isFinite(lcParsed) ? lcParsed : undefined;
    return {
        isMatch:
            data.biometricMatch.isMatch === true || data.biometricMatch.isMatch === 'true',
        matchConfidence: parseFloat(data.biometricMatch.matchConfidence) || 0,
        spoofingRisk: parseFloat(data.liveness.spoofingRisk) || 0,
        livenessConfidence,
        livenessIndicators: Array.isArray(data.liveness?.livenessIndicators) ? data.liveness.livenessIndicators : [],
        faceCount: parseSelfieFaceCount(data.faceDetection.selfie1FaceCount),
        lightingCondition: data.imageQuality.lightingCondition || 'good',
        faceSize: data.imageQuality.faceSize || 'adequate',
        faceCoverage: data.imageQuality.faceCoverage || 'fully_visible',
        faceDetectionConfidence: parseFloat(data.faceDetection.faceDetectionConfidence) || 0,
        imageQuality: parseFloat(data.imageQuality.selfie1Quality) || 0,
        imageQualityIssues: Array.isArray(data.imageQuality.qualityIssues)
            ? data.imageQuality.qualityIssues
            : []
    };
}

function parseSelfieFaceCount(fc: unknown): number {
    if (typeof fc === 'number' && Number.isFinite(fc)) return fc;
    const parsed = parseInt(String(fc ?? '').trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

export class VerificationService {
    static async verifyId(configInput: any, images: { front: string; back?: string }) {
        try {
            const config = KycConfigSchema.parse(configInput);
            const prompt = generateIdCardPrompt(config);
            const imageContent = [{ type: 'image_url', image_url: { url: images.front } }];
            if (images.back) {
                imageContent.push({ type: 'image_url', image_url: { url: images.back } });
            }

            const response = await groq.chat.completions.create({
                model: MODEL,
                temperature: TEMPERATURE,
                max_tokens: MAX_TOKENS,
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'id_verification',
                        strict: true,
                        schema: ID_VERIFICATION_SCHEMA as any
                    }
                },
                messages: [{ role: 'system', content: prompt }, { role: 'user', content: imageContent as any }]
            });

            const rawContent = response.choices[0]?.message?.content;
            if (!rawContent) throw new Error('Empty response from LLM');

            const raw = JSON.parse(rawContent);
            const validationResult = IdVerificationSchema.safeParse(raw);
            if (!validationResult.success) {
                logger.warn({ errors: validationResult.error.errors }, 'Zod validation failed for ID verification response');
                throw new Error('LLM response does not match expected schema');
            }

            const parsed = validationResult.data;
            const { parsed: penalized, errors: placeholderErrors } = applyFakeDataPenalties(parsed as any, config);
            const validation = IdCardPostProcessor.validate(penalized as any, config);
            const mergedErrors = mergeIdValidationErrors(placeholderErrors, validation.errors);
            const hasCritical = mergedErrors.some(e => e.severity === 'critical');
            const status = hasCritical ? STATUS.REJECTED : STATUS.APPROVED;

            return {
                success: true,
                status,
                data: penalized.extraction,
                confidence: penalized.confidence,
                quality: penalized.quality,
                authenticity: penalized.authenticity,
                errors: mergedErrors,
                mrz: penalized.mrz
            };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Verification service error');
            return {
                success: false,
                status: STATUS.FAILED,
                errors: [{ code: ERRORS.VERIFICATION_ERROR.code, message: error.message }]
            };
        }
    }

    /**
     * Same pipeline as verifyId: validated config → selfie prompt (thresholds embedded) → Groq structured JSON → Zod → threshold rules.
     */
    static async verifySelfie(
        configInput: any,
        opts: { idPhotoUrl: string; selfieUrls: string[] }
    ) {
        try {
            const config = KycConfigSchema.parse(configInput);
            const prompt = generateSelfiePrompt(config);
            const selfies = opts.selfieUrls;
            const imageContent = [
                { type: 'image_url', image_url: { url: opts.idPhotoUrl } },
                ...selfies.map(url => ({ type: 'image_url', image_url: { url } }))
            ];

            const response = await groq.chat.completions.create({
                model: MODEL,
                temperature: TEMPERATURE,
                max_tokens: MAX_TOKENS,
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'selfie_verification_response',
                        strict: true,
                        schema: SELFIE_VERIFICATION_SCHEMA as any
                    }
                },
                messages: [
                    { role: 'system', content: prompt },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Compare the ID photo (first image) with the selfie${selfies.length > 1 ? 's' : ''} (${selfies.length} image${selfies.length > 1 ? 's' : ''}).`
                            },
                            ...(imageContent as any)
                        ] as any
                    }
                ]
            });

            const rawData = parseJsonContent(response.choices[0]?.message?.content);
            if (!rawData) {
                return {
                    success: false,
                    status: STATUS.FAILED,
                    error: ERRORS.INVALID_JSON_RESPONSE
                };
            }

            const validationResult = SelfieVerificationSchema.safeParse(rawData);
            if (!validationResult.success) {
                logger.warn({ errors: validationResult.error.errors }, 'Zod validation failed for selfie verification');
                return {
                    success: false,
                    status: STATUS.FAILED,
                    error: ERRORS.INVALID_JSON_RESPONSE
                };
            }

            const data = validationResult.data as Record<string, any>;
            const normalized = normalizeSelfiePayload(data);
            const resolved = resolveKycConfig(config);
            const thresholdErrors = evaluateSelfieRules(normalized, resolved);
            const llmListed = Array.isArray(data.validation?.errors) ? data.validation.errors : [];
            const allErrors = [...llmListed, ...thresholdErrors];
            const uniqueErrors = dedupeErrorsByCode(allErrors);

            const status = determineStatus(uniqueErrors as any[], {
                isMatch: normalized.isMatch,
                matchConfidence: normalized.matchConfidence
            });

            return {
                success: true,
                status,
                data: {
                    isMatch: normalized.isMatch,
                    matchConfidence: normalized.matchConfidence,
                    spoofingRisk: normalized.spoofingRisk,
                    livenessConfidence: normalized.livenessConfidence,
                    livenessIndicators: normalized.livenessIndicators,
                    faceCount: normalized.faceCount,
                    lightingCondition: normalized.lightingCondition,
                    faceSize: normalized.faceSize,
                    faceCoverage: normalized.faceCoverage,
                    faceDetectionConfidence: normalized.faceDetectionConfidence,
                    imageQuality: normalized.imageQuality,
                    imageQualityIssues: normalized.imageQualityIssues
                },
                errors: uniqueErrors
            };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Selfie verification service error');
            return {
                success: false,
                status: STATUS.FAILED,
                error: ERRORS.GROQ_API_ERROR,
                details: error.message
            };
        }
    }
}
