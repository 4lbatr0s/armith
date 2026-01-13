/**
 * KYC Configuration Defaults
 * Default values and presets for KYC configuration
 */

// ============================================================================
// DEFAULT VALUES
// ============================================================================

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

// ============================================================================
// PRESETS
// ============================================================================

export const PRESETS = {
    strict: {
        name: 'Strict Verification',
        description: 'Maximum security, lowest false positives',
        verificationSteps: {
            ...DEFAULT_VERIFICATION_STEPS,
            logicOperator: 'AND',
        },
        idCardThresholds: {
            ...DEFAULT_ID_CARD_THRESHOLDS,
            minOverallConfidence: 0.92,
            minFullNameConfidence: 0.90,
            minIdentityNumberConfidence: 0.95,
            minImageQuality: 0.75,
            maxTamperingRisk: 0.25,
            acceptableDocumentConditions: ['excellent', 'good'],
        },
        selfieThresholds: {
            ...DEFAULT_SELFIE_THRESHOLDS,
            minMatchConfidence: 92,
            maxSpoofingRisk: 0.20,
            minImageQuality: 0.75,
            minLivenessConfidence: 0.85,
            allowedLightingConditions: ['excellent', 'good'],
            requireMultipleAngles: true,
        },
        validationRules: {
            ...DEFAULT_VALIDATION_RULES,
            allowDamagedDocuments: false,
            enforceGenderConsistency: true,
            requireHologramDetection: true,
        },
    },

    balanced: {
        name: 'Balanced Verification',
        description: 'Standard security, good user experience',
        verificationSteps: DEFAULT_VERIFICATION_STEPS,
        idCardThresholds: DEFAULT_ID_CARD_THRESHOLDS,
        selfieThresholds: DEFAULT_SELFIE_THRESHOLDS,
        validationRules: DEFAULT_VALIDATION_RULES,
    },

    lenient: {
        name: 'Lenient Verification',
        description: 'Lower friction, higher false positives',
        verificationSteps: {
            ...DEFAULT_VERIFICATION_STEPS,
            logicOperator: 'OR',
            allowPartialSubmission: true,
        },
        idCardThresholds: {
            ...DEFAULT_ID_CARD_THRESHOLDS,
            minOverallConfidence: 0.70,
            minFullNameConfidence: 0.65,
            minIdentityNumberConfidence: 0.80,
            minImageQuality: 0.45,
            maxTamperingRisk: 0.60,
            acceptableDocumentConditions: ['excellent', 'good', 'fair', 'poor'],
        },
        selfieThresholds: {
            ...DEFAULT_SELFIE_THRESHOLDS,
            minMatchConfidence: 75,
            maxSpoofingRisk: 0.50,
            minImageQuality: 0.45,
            minLivenessConfidence: 0.55,
            allowedLightingConditions: ['excellent', 'good', 'acceptable', 'poor'],
        },
        validationRules: {
            ...DEFAULT_VALIDATION_RULES,
            enforceAgeCheck: false,
            enforceExpiryCheck: false,
            enforceTcChecksumValidation: false,
            enforceMrzCrossValidation: false,
            maxVerificationRetries: 5,
            retryCooldownMinutes: 1,
        },
    },
};

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create default configuration for a user
 * @param {string} userId - User ID
 * @param {string} countryCode - Country code (default: 'TR')
 * @param {string} [environment='production'] - Environment
 * @returns {Object} Default configuration object
 */
export function createDefaultConfig(userId, countryCode = 'TR', environment = 'production') {
    return {
        userId,
        countryCode: countryCode.toUpperCase(),
        name: `${countryCode.toUpperCase()} Default Configuration`,
        description: `Standard KYC verification settings for ${countryCode.toUpperCase()}`,
        verificationSteps: { ...DEFAULT_VERIFICATION_STEPS },
        idCardThresholds: { ...DEFAULT_ID_CARD_THRESHOLDS },
        selfieThresholds: { ...DEFAULT_SELFIE_THRESHOLDS },
        validationRules: { ...DEFAULT_VALIDATION_RULES },
        customThresholds: {},
        isActive: true,
        version: 1,
        environment,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

/**
 * Create configuration from preset
 * @param {'strict'|'balanced'|'lenient'} preset - Preset name
 * @param {string} userId - User ID
 * @param {string} countryCode - Country code
 * @param {string} [environment='production'] - Environment
 * @returns {Object} Configuration from preset
 */
export function createFromPreset(preset, userId, countryCode = 'TR', environment = 'production') {
    const presetConfig = PRESETS[preset] || PRESETS.balanced;

    return {
        userId,
        countryCode: countryCode.toUpperCase(),
        name: `${countryCode.toUpperCase()} ${presetConfig.name}`,
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
        updatedAt: new Date(),
    };
}
