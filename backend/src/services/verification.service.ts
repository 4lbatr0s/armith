import Groq from 'groq-sdk';
import { PromptGenerator } from '../prompts/prompt-generator.js';
import { IdCardPostProcessor } from '../validation/post-processor.js';
import { KycConfigSchema } from '../schemas/config.schema.js';
import { IdVerificationSchema, ID_VERIFICATION_SCHEMA } from '../../kyc/schemas.js'; // Reusing existing schema for now or move it to src
import logger from '../../lib/logger.js';
import { STATUS, ERRORS } from '../../kyc/config.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export class VerificationService {
    static async verifyId(configInput: any, images: { front: string, back?: string }) {
        try {
            // 1. Validate Config
            const config = KycConfigSchema.parse(configInput);

            // 2. Generate Prompt
            const prompt = PromptGenerator.generateIdCardPrompt(config);

            // 3. Call LLM
            const imageContent = [
                { type: 'image_url', image_url: { url: images.front } }
            ];
            if (images.back) {
                imageContent.push({ type: 'image_url', image_url: { url: images.back } });
            }

            const response = await groq.chat.completions.create({
                model: MODEL,
                temperature: 0.1,
                max_tokens: 2000,
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'id_verification',
                        strict: true,
                        schema: ID_VERIFICATION_SCHEMA as any
                    }
                },
                messages: [
                    { role: 'system', content: prompt },
                    {
                        role: 'user',
                        content: imageContent as any
                    }
                ]
            });

            const rawContent = response.choices[0]?.message?.content;

            if (!rawContent) {
                throw new Error('Empty response from LLM');
            }

            const raw = JSON.parse(rawContent);

            // 4. Parse response with Zod
            const validationResult = IdVerificationSchema.safeParse(raw);

            if (!validationResult.success) {
                logger.warn({ errors: validationResult.error.errors }, 'Zod validation failed for ID verification response');

                throw new Error('LLM response does not match expected schema');
            }

            const parsed = validationResult.data;

            // 5. Post-process (Universal + Country Specific)
            const validation = IdCardPostProcessor.validate(parsed, config);

            // 6. Map to legacy or new status
            const status = validation.isValid ? STATUS.APPROVED : (validation.errors.some(e => e.severity === 'critical') ? STATUS.REJECTED : STATUS.PENDING);

            return {
                success: true,
                status,
                data: parsed.extraction,
                confidence: parsed.confidence,
                quality: parsed.quality,
                errors: validation.errors,
                mrz: parsed.mrz
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
}
