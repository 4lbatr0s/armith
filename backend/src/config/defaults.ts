export const DEFAULT_VERIFICATION_STEPS = {
    requireIdCard: true,
    requireSelfie: true,
    logicOperator: 'AND',
    allowPartialSubmission: false,
};

export const DEFAULT_ID_CARD_THRESHOLDS = {
    minOverallConfidence: 0.85,
    minFullNameConfidence: 0.80,
    minIdentityNumberConfidence: 0.90,
    minDateOfBirthConfidence: 0.85,
    minExpiryDateConfidence: 0.85,
    minMrzConfidence: 0.80,
    minImageQuality: 0.60,
    maxTamperingRisk: 0.40,
    minGenderConfidence: 0.75,
    minSerialNumberConfidence: 0.80,
    acceptableDocumentConditions: ['excellent', 'good', 'fair'],
};

export const DEFAULT_SELFIE_THRESHOLDS = {
    minMatchConfidence: 85,
    maxSpoofingRisk: 0.35,
    minImageQuality: 0.60,
    minLivenessConfidence: 0.70,
    requiredFaceCount: 1,
    allowedLightingConditions: ['excellent', 'good', 'acceptable'],
    allowedFaceSizes: ['optimal', 'adequate'],
    allowedFaceCoverage: ['fully_visible', 'partially_obscured'],
    minFacialFeatureConfidence: 0.70,
    requireMultipleAngles: false,
    minAngleDifference: 15,
};

export const DEFAULT_VALIDATION_RULES = {
    enforceAgeCheck: true,
    minAge: 18,
    maxAge: 120,
    enforceExpiryCheck: true,
    expiryWarningDays: 30,
    enforceTcChecksumValidation: true,
    enforceMrzCrossValidation: true,
    requireHologramDetection: false,
    enforceNameFormat: true,
    allowDamagedDocuments: true,
    enforceGenderConsistency: false,
    maxVerificationRetries: 3,
    retryCooldownMinutes: 5,
};

export const DEFAULT_CONFIGS: Record<string, any> = {
    TR: {
        countryCode: 'TR',
        validationRules: { ...DEFAULT_VALIDATION_RULES, enforceTcChecksumValidation: true },
    },
    DE: {
        countryCode: 'DE',
        validationRules: { ...DEFAULT_VALIDATION_RULES, enforceTcChecksumValidation: false }, // No TC in DE
    },
    GB: {
        countryCode: 'GB',
        validationRules: { ...DEFAULT_VALIDATION_RULES, enforceTcChecksumValidation: false }, // No TC in GB
    }
};

export function createDefaultConfig(userId: string, countryCode: string = 'TR', environment: string = 'production') {
    const base = DEFAULT_CONFIGS[countryCode.toUpperCase()] || DEFAULT_CONFIGS.TR;

    return {
        userId,
        name: `Default Configuration (${countryCode.toUpperCase()})`,
        description: `Standard KYC verification settings for ${countryCode.toUpperCase()}`,
        countryCode: base.countryCode,
        verificationSteps: { ...DEFAULT_VERIFICATION_STEPS },
        idCardThresholds: { ...DEFAULT_ID_CARD_THRESHOLDS },
        selfieThresholds: { ...DEFAULT_SELFIE_THRESHOLDS },
        validationRules: { ...base.validationRules },
        customThresholds: {},
        isActive: true,
        version: 1,
        environment,
    };
}
