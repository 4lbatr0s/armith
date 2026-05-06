/**
 * Single source of truth for numeric KYC defaults and presets.
 */
export const DEFAULT_VERIFICATION_STEPS = {
    requireIdCard: true,
    requireSelfie: true,
    logicOperator: 'AND',
    allowPartialSubmission: false
};
export const DEFAULT_ID_CARD_THRESHOLDS = {
    minOverallConfidence: 0.85,
    minFullNameConfidence: 0.8,
    minIdentityNumberConfidence: 0.9,
    minDateOfBirthConfidence: 0.85,
    minExpiryDateConfidence: 0.85,
    minMrzConfidence: 0.8,
    minImageQuality: 0.62,
    maxTamperingRisk: 0.35,
    minGenderConfidence: 0.75,
    minSerialNumberConfidence: 0.8,
    /** Minimum document vitality score (0–1) from authenticity.documentVitalityScore. */
    minDocumentVitalityConfidence: 0.55,
    acceptableDocumentConditions: ['excellent', 'good', 'fair']
};
export const DEFAULT_SELFIE_THRESHOLDS = {
    /** Same-person bar: 0–100; stricter default to reduce false matches across different people. */
    minMatchConfidence: 92,
    maxSpoofingRisk: 0.25,
    minImageQuality: 0.62,
    minLivenessConfidence: 0.78,
    requiredFaceCount: 1,
    allowedLightingConditions: ['excellent', 'good', 'acceptable'],
    allowedFaceSizes: ['optimal', 'adequate'],
    allowedFaceCoverage: ['fully_visible', 'partially_obscured'],
    minFacialFeatureConfidence: 0.78,
    requireMultipleAngles: false,
    minAngleDifference: 15
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
    retryCooldownMinutes: 5
};
/** Fallback DTO aligned with flattened API / historical `THRESHOLDS`. */
export const FLAT_LEGACY_THRESHOLDS = {
    fullNameConfidence: DEFAULT_ID_CARD_THRESHOLDS.minFullNameConfidence,
    identityNumberConfidence: DEFAULT_ID_CARD_THRESHOLDS.minIdentityNumberConfidence,
    dateOfBirthConfidence: DEFAULT_ID_CARD_THRESHOLDS.minDateOfBirthConfidence,
    expiryDateConfidence: DEFAULT_ID_CARD_THRESHOLDS.minExpiryDateConfidence,
    imageQuality: DEFAULT_ID_CARD_THRESHOLDS.minImageQuality,
    minDocumentVitalityConfidence: DEFAULT_ID_CARD_THRESHOLDS.minDocumentVitalityConfidence,
    matchConfidence: DEFAULT_SELFIE_THRESHOLDS.minMatchConfidence,
    faceDetectionConfidence: DEFAULT_SELFIE_THRESHOLDS.minFacialFeatureConfidence,
    spoofingRiskMax: DEFAULT_SELFIE_THRESHOLDS.maxSpoofingRisk,
    minAge: DEFAULT_VALIDATION_RULES.minAge,
    maxAge: DEFAULT_VALIDATION_RULES.maxAge
};
export const PRESETS = {
    strict: {
        name: 'Strict Verification',
        description: 'Maximum security, lowest false positives',
        verificationSteps: {
            ...DEFAULT_VERIFICATION_STEPS,
            logicOperator: 'AND'
        },
        idCardThresholds: {
            ...DEFAULT_ID_CARD_THRESHOLDS,
            minOverallConfidence: 0.92,
            minFullNameConfidence: 0.9,
            minIdentityNumberConfidence: 0.95,
            minImageQuality: 0.75,
            maxTamperingRisk: 0.25,
            minDocumentVitalityConfidence: 0.65,
            acceptableDocumentConditions: ['excellent', 'good']
        },
        selfieThresholds: {
            ...DEFAULT_SELFIE_THRESHOLDS,
            minMatchConfidence: 94,
            maxSpoofingRisk: 0.18,
            minImageQuality: 0.75,
            minLivenessConfidence: 0.85,
            allowedLightingConditions: ['excellent', 'good'],
            requireMultipleAngles: true
        },
        validationRules: {
            ...DEFAULT_VALIDATION_RULES,
            allowDamagedDocuments: false,
            enforceGenderConsistency: true,
            requireHologramDetection: true
        }
    },
    balanced: {
        name: 'Balanced Verification',
        description: 'Standard security, good user experience',
        verificationSteps: DEFAULT_VERIFICATION_STEPS,
        idCardThresholds: DEFAULT_ID_CARD_THRESHOLDS,
        selfieThresholds: DEFAULT_SELFIE_THRESHOLDS,
        validationRules: DEFAULT_VALIDATION_RULES
    },
    lenient: {
        name: 'Lenient Verification',
        description: 'Lower friction, higher false positives',
        verificationSteps: {
            ...DEFAULT_VERIFICATION_STEPS,
            logicOperator: 'OR',
            allowPartialSubmission: true
        },
        idCardThresholds: {
            ...DEFAULT_ID_CARD_THRESHOLDS,
            minOverallConfidence: 0.7,
            minFullNameConfidence: 0.65,
            minIdentityNumberConfidence: 0.8,
            minImageQuality: 0.45,
            maxTamperingRisk: 0.6,
            minDocumentVitalityConfidence: 0.35,
            acceptableDocumentConditions: ['excellent', 'good', 'fair', 'poor']
        },
        selfieThresholds: {
            ...DEFAULT_SELFIE_THRESHOLDS,
            minMatchConfidence: 75,
            maxSpoofingRisk: 0.5,
            minImageQuality: 0.45,
            minLivenessConfidence: 0.55,
            allowedLightingConditions: ['excellent', 'good', 'acceptable', 'poor']
        },
        validationRules: {
            ...DEFAULT_VALIDATION_RULES,
            enforceAgeCheck: false,
            enforceExpiryCheck: false,
            enforceTcChecksumValidation: false,
            enforceMrzCrossValidation: false,
            maxVerificationRetries: 5,
            retryCooldownMinutes: 1
        }
    }
};
export function createDefaultConfig(userId, countryCode = 'TR', environment = 'production') {
    const cc = countryCode.toUpperCase();
    return {
        userId,
        countryCode: cc,
        name: `${cc} Default Configuration`,
        description: `Standard KYC verification settings for ${cc}`,
        verificationSteps: { ...DEFAULT_VERIFICATION_STEPS },
        idCardThresholds: { ...DEFAULT_ID_CARD_THRESHOLDS },
        selfieThresholds: { ...DEFAULT_SELFIE_THRESHOLDS },
        validationRules: { ...DEFAULT_VALIDATION_RULES },
        customThresholds: {},
        isActive: true,
        version: 1,
        environment,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}
export function createFromPreset(preset, userId, countryCode = 'TR', environment = 'production') {
    const presetConfig = PRESETS[preset] ?? PRESETS.balanced;
    const cc = countryCode.toUpperCase();
    return {
        userId,
        countryCode: cc,
        name: `${cc} ${presetConfig.name}`,
        description: presetConfig.description,
        verificationSteps: { ...presetConfig.verificationSteps },
        idCardThresholds: { ...presetConfig.idCardThresholds },
        selfieThresholds: { ...presetConfig.selfieThresholds },
        validationRules: { ...presetConfig.validationRules },
        customThresholds: {},
        isActive: true,
        version: 1,
        environment,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}
