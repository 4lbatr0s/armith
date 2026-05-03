import { z } from 'zod';
import {
    DEFAULT_VERIFICATION_STEPS,
    DEFAULT_ID_CARD_THRESHOLDS,
    DEFAULT_SELFIE_THRESHOLDS,
    DEFAULT_VALIDATION_RULES
} from '../../thresholds/defaults.js';

export const KycConfigSchema = z.object({
    userId: z.string(),
    organizationId: z.string().optional(),
    name: z.string().default('KYC Configuration'),
    description: z.string().optional(),
    countryCode: z.string().length(2).toUpperCase().default('TR'),
    environment: z.enum(['test', 'staging', 'production']).default('production'),

    verificationSteps: z.object({
        requireIdCard: z.boolean(),
        requireSelfie: z.boolean(),
        logicOperator: z.enum(['AND', 'OR']),
        allowPartialSubmission: z.boolean()
    }).default(() => ({ ...DEFAULT_VERIFICATION_STEPS })),

    idCardThresholds: z
        .object({
            minOverallConfidence: z.number(),
            minFullNameConfidence: z.number(),
            minIdentityNumberConfidence: z.number(),
            minDateOfBirthConfidence: z.number(),
            minExpiryDateConfidence: z.number(),
            minMrzConfidence: z.number(),
            minImageQuality: z.number(),
            maxTamperingRisk: z.number(),
            minGenderConfidence: z.number(),
            minSerialNumberConfidence: z.number(),
            acceptableDocumentConditions: z.array(z.string())
        })
        .default(() => ({
            ...DEFAULT_ID_CARD_THRESHOLDS,
            acceptableDocumentConditions: [...DEFAULT_ID_CARD_THRESHOLDS.acceptableDocumentConditions]
        })),

    selfieThresholds: z
        .object({
            minMatchConfidence: z.number(),
            maxSpoofingRisk: z.number(),
            minImageQuality: z.number(),
            minLivenessConfidence: z.number(),
            requiredFaceCount: z.number(),
            allowedLightingConditions: z.array(z.string()),
            allowedFaceSizes: z.array(z.string()),
            allowedFaceCoverage: z.array(z.string()),
            minFacialFeatureConfidence: z.number(),
            requireMultipleAngles: z.boolean(),
            minAngleDifference: z.number()
        })
        .default(() => ({
            ...DEFAULT_SELFIE_THRESHOLDS,
            allowedLightingConditions: [...DEFAULT_SELFIE_THRESHOLDS.allowedLightingConditions],
            allowedFaceSizes: [...DEFAULT_SELFIE_THRESHOLDS.allowedFaceSizes],
            allowedFaceCoverage: [...DEFAULT_SELFIE_THRESHOLDS.allowedFaceCoverage]
        })),

    validationRules: z
        .object({
            enforceAgeCheck: z.boolean(),
            minAge: z.number(),
            maxAge: z.number(),
            enforceExpiryCheck: z.boolean(),
            expiryWarningDays: z.number(),
            enforceTcChecksumValidation: z.boolean(),
            enforceMrzCrossValidation: z.boolean(),
            requireHologramDetection: z.boolean(),
            enforceNameFormat: z.boolean(),
            allowDamagedDocuments: z.boolean(),
            enforceGenderConsistency: z.boolean(),
            maxVerificationRetries: z.number(),
            retryCooldownMinutes: z.number()
        })
        .default(() => ({ ...DEFAULT_VALIDATION_RULES })),

    customThresholds: z.record(z.any()).default({}),
    isActive: z.boolean().default(true),
    version: z.number().default(1)
});

export type KycConfig = z.infer<typeof KycConfigSchema>;
