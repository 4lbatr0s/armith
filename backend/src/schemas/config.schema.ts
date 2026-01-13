import { z } from 'zod';

export const KycConfigSchema = z.object({
    userId: z.string(),
    organizationId: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    countryCode: z.string().length(2).toUpperCase().default('TR'),
    environment: z.enum(['test', 'staging', 'production']).default('production'),

    verificationSteps: z.object({
        requireIdCard: z.boolean().default(true),
        requireSelfie: z.boolean().default(true),
        logicOperator: z.enum(['AND', 'OR']).default('AND'),
        allowPartialSubmission: z.boolean().default(false),
    }).default({}),

    idCardThresholds: z.object({
        minOverallConfidence: z.number().default(0.85),
        minFullNameConfidence: z.number().default(0.80),
        minIdentityNumberConfidence: z.number().default(0.90),
        minDateOfBirthConfidence: z.number().default(0.85),
        minExpiryDateConfidence: z.number().default(0.85),
        minMrzConfidence: z.number().default(0.80),
        minImageQuality: z.number().default(0.60),
        maxTamperingRisk: z.number().default(0.40),
        minGenderConfidence: z.number().default(0.75),
        minSerialNumberConfidence: z.number().default(0.80),
        acceptableDocumentConditions: z.array(z.string()).default(['excellent', 'good', 'fair']),
    }).default({}),

    selfieThresholds: z.object({
        minMatchConfidence: z.number().default(85),
        maxSpoofingRisk: z.number().default(0.35),
        minImageQuality: z.number().default(0.60),
        minLivenessConfidence: z.number().default(0.70),
        requiredFaceCount: z.number().default(1),
        allowedLightingConditions: z.array(z.string()).default(['excellent', 'good', 'acceptable']),
        allowedFaceSizes: z.array(z.string()).default(['optimal', 'adequate']),
        allowedFaceCoverage: z.array(z.string()).default(['fully_visible', 'partially_obscured']),
        minFacialFeatureConfidence: z.number().default(0.70),
        requireMultipleAngles: z.boolean().default(false),
        minAngleDifference: z.number().default(15),
    }).default({}),

    validationRules: z.object({
        enforceAgeCheck: z.boolean().default(true),
        minAge: z.number().default(18),
        maxAge: z.number().default(120),
        enforceExpiryCheck: z.boolean().default(true),
        expiryWarningDays: z.number().default(30),
        enforceTcChecksumValidation: z.boolean().default(true),
        enforceMrzCrossValidation: z.boolean().default(true),
        requireHologramDetection: z.boolean().default(false),
        enforceNameFormat: z.boolean().default(true),
        allowDamagedDocuments: z.boolean().default(true),
        enforceGenderConsistency: z.boolean().default(false),
        maxVerificationRetries: z.number().default(3),
        retryCooldownMinutes: z.number().default(5),
    }).default({}),

    customThresholds: z.record(z.any()).default({}),
    isActive: z.boolean().default(true),
    version: z.number().default(1),
});

export type KycConfig = z.infer<typeof KycConfigSchema>;
