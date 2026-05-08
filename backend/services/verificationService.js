import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import { generateIdCardPrompt, generateSelfiePrompt } from '../prompts/load-prompt.js';
import { IdCardPostProcessor } from '../validation/post-processor.js';
import { KycConfigSchema } from '../schemas/config.schema.js';
import { IdVerificationSchema, ID_VERIFICATION_SCHEMA, SelfieVerificationSchema, SELFIE_VERIFICATION_SCHEMA } from '../kyc/schemas.js';
import logger from '../lib/logger.js';
import { STATUS, ERRORS, determineStatus } from '../kyc/config.js';
import { evaluateSelfieRules } from '../thresholds/evaluate.js';
import { resolveKycConfig } from '../thresholds/resolve.js';
import { applyFakeDataPenalties } from '../thresholds/apply-fake-data-penalties.js';

const svcDir = dirname(fileURLToPath(import.meta.url));
function loadPipelineGoldenJson(fileName) {
    const p = join(svcDir, '../test/fixtures/golden', fileName);
    return JSON.parse(readFileSync(p, 'utf8'));
}
/** Lazy singleton: CI loads this module without `GROQ_API_KEY`; fixture tests never hit the API. */
let groqSingleton;
function getGroqClient() {
    if (!groqSingleton) {
        groqSingleton = new Groq({ apiKey: process.env.GROQ_API_KEY ?? 'skipped-no-network-fixture-load' });
    }
    return groqSingleton;
}
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEMPERATURE = 0.1;
const MAX_TOKENS = 2000;

/** Wall-clock guard only — Groq rejects `signal` on `chat.completions.create` (400 unsupported property). */
function groqCompletionWithTimeout(createPromise) {
    const ms = Number(process.env.GROQ_TIMEOUT_MS || 120000);
    if (!Number.isFinite(ms) || ms <= 0)
        return createPromise;
    let id;
    const timeout = new Promise((_, rej) => {
        id = setTimeout(() => rej(new Error(`Groq request timed out after ${ms}ms`)), ms);
    });
    return Promise.race([
        createPromise.finally(() => {
            if (id)
                clearTimeout(id);
        }),
        timeout
    ]);
}
function parseJsonContent(content) {
    if (!content)
        return null;
    try {
        return JSON.parse(content);
    }
    catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            }
            catch {
                return null;
            }
        }
        return null;
    }
}
function mergeIdValidationErrors(a, b) {
    const seen = new Set();
    const out = [];
    for (const e of [...a, ...b]) {
        const k = `${e.code}-${e.field ?? ''}-${e.message}`;
        if (seen.has(k))
            continue;
        seen.add(k);
        out.push(e);
    }
    return out;
}
function dedupeErrorsByCode(errors) {
    const seen = new Set();
    return errors.filter(e => {
        const key = e?.code !== undefined && e?.code !== null
            ? String(e.code)
            : `${e.message ?? ''}:${e.field ?? ''}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}

/** Groq-less path shared with VERIFICATION_PIPELINE_FIXTURE tests (golden JSON fixtures). */
function completeIdVerificationPipeline(config, raw) {
    const validationResult = IdVerificationSchema.safeParse(raw);
    if (!validationResult.success) {
        logger.warn({ errors: validationResult.error.errors }, 'Zod validation failed for ID verification response');
        throw new Error('LLM response does not match expected schema');
    }
    const parsed = validationResult.data;
    const { parsed: penalized, errors: placeholderErrors } = applyFakeDataPenalties(parsed, config);
    const validation = IdCardPostProcessor.validate(penalized, config);
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
}

function completeSelfieVerificationPipeline(config, rawData) {
    const validationResult = SelfieVerificationSchema.safeParse(rawData);
    if (!validationResult.success) {
        logger.warn({ errors: validationResult.error.errors }, 'Zod validation failed for selfie verification');
        return {
            success: false,
            status: STATUS.FAILED,
            error: ERRORS.INVALID_JSON_RESPONSE
        };
    }
    const data = validationResult.data;
    const normalized = normalizeSelfiePayload(data);
    const resolved = resolveKycConfig(config);
    const thresholdErrors = evaluateSelfieRules(normalized, resolved);
    const llmListed = Array.isArray(data.validation?.errors) ? data.validation.errors : [];
    const allErrors = [...llmListed, ...thresholdErrors];
    const uniqueErrors = dedupeErrorsByCode(allErrors);
    const status = determineStatus(uniqueErrors, {
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
}
function normalizeSelfiePayload(data) {
    const lcRaw = data.liveness?.livenessConfidence;
    const lcParsed = lcRaw === null || lcRaw === undefined ? NaN : parseFloat(String(lcRaw));
    const livenessConfidence = Number.isFinite(lcParsed) ? lcParsed : undefined;
    const mismatchReasons = Array.isArray(data.explainability?.mismatchReasons)
        ? data.explainability.mismatchReasons.filter((x) => typeof x === 'string' && String(x).trim().length > 0)
        : [];
    const fs = data.biometricMatch?.facialFeatureScores;
    const facialScores = fs && typeof fs === 'object'
        ? {
            facialStructure: parseOptionalScore(fs.facialStructure),
            eyes: parseOptionalScore(fs.eyes),
            nose: parseOptionalScore(fs.nose),
            mouthAndChin: parseOptionalScore(fs.mouthAndChin)
        }
        : null;
    return {
        isMatch: data.biometricMatch.isMatch === true || data.biometricMatch.isMatch === 'true',
        matchConfidence: parseFloat(data.biometricMatch.matchConfidence) || 0,
        spoofingRisk: parseFloat(data.liveness.spoofingRisk) || 0,
        livenessConfidence,
        livenessIndicators: Array.isArray(data.liveness?.livenessIndicators) ? data.liveness.livenessIndicators : [],
        mismatchReasons,
        facialScores,
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
function parseOptionalScore(v) {
    if (v === null || v === undefined)
        return undefined;
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
}
function parseSelfieFaceCount(fc) {
    if (typeof fc === 'number' && Number.isFinite(fc))
        return fc;
    const parsed = parseInt(String(fc ?? '').trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
}
export class VerificationService {
    static async verifyId(configInput, images) {
        try {
            const config = KycConfigSchema.parse(configInput);
            const pipelineFixture = process.env.VERIFICATION_PIPELINE_FIXTURE?.trim();
            if (pipelineFixture === 'id') {
                const rawFixture = loadPipelineGoldenJson('id-verification.golden.json');
                return completeIdVerificationPipeline(config, rawFixture);
            }
            const prompt = generateIdCardPrompt(config);
            const imageContent = [{ type: 'image_url', image_url: { url: images.front } }];
            if (images.back) {
                imageContent.push({ type: 'image_url', image_url: { url: images.back } });
            }

            const response = await groqCompletionWithTimeout(getGroqClient().chat.completions.create({
                model: MODEL,
                temperature: TEMPERATURE,
                max_tokens: MAX_TOKENS,
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'id_verification',
                        strict: true,
                        schema: ID_VERIFICATION_SCHEMA
                    }
                },
                messages: [{ role: 'system', content: prompt }, { role: 'user', content: imageContent }]
            }));
            const rawContent = response.choices[0]?.message?.content;
            if (!rawContent)
                throw new Error('Empty response from LLM');
            const raw = JSON.parse(rawContent);
            return completeIdVerificationPipeline(config, raw);
        }
        catch (error) {
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
    static async verifySelfie(configInput, opts) {
        try {
            const config = KycConfigSchema.parse(configInput);
            const pipelineFixture = process.env.VERIFICATION_PIPELINE_FIXTURE?.trim();
            if (pipelineFixture === 'selfie') {
                const rawFixture = loadPipelineGoldenJson('selfie-verification.golden.json');
                return completeSelfieVerificationPipeline(config, rawFixture);
            }

            const prompt = generateSelfiePrompt(config);
            const selfies = opts.selfieUrls;
            const imageContent = [
                { type: 'image_url', image_url: { url: opts.idPhotoUrl } },
                ...selfies.map(url => ({ type: 'image_url', image_url: { url } }))
            ];

            const response = await groqCompletionWithTimeout(getGroqClient().chat.completions.create({
                model: MODEL,
                temperature: TEMPERATURE,
                max_tokens: MAX_TOKENS,
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'selfie_verification_response',
                        strict: true,
                        schema: SELFIE_VERIFICATION_SCHEMA
                    }
                },
                messages: [
                    { role: 'system', content: prompt },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Compare the ID portrait in the first image with the live subject in the selfie image(s). They must be the same real person. If they look like different individuals (different age cohort, jaw/eyes/nose shape, facial hair pattern), set biometricMatch.isMatch to false and matchConfidence below 45, and list concrete differences in explainability.mismatchReasons. Do not output high match scores for clearly different people. Specimen or sample ID cards (e.g. names like TEST, sequential placeholder TC numbers) are not valid customer identity—treat as non-matching / high risk.`
                            },
                            ...imageContent
                        ]
                    }
                ]
            }));
            const rawData = parseJsonContent(response.choices[0]?.message?.content);
            if (!rawData) {
                return {
                    success: false,
                    status: STATUS.FAILED,
                    error: ERRORS.INVALID_JSON_RESPONSE
                };
            }
            return completeSelfieVerificationPipeline(config, rawData);
        }
        catch (error) {
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
