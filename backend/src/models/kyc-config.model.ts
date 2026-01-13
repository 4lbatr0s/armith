import mongoose from 'mongoose';

const kycConfigurationSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        organizationId: String,
        name: {
            type: String,
            required: true,
        },
        description: String,
        countryCode: {
            type: String,
            default: 'TR',
            required: true,
            uppercase: true,
            trim: true,
        },

        // Configuration objects
        verificationSteps: {
            requireIdCard: { type: Boolean, default: true },
            requireSelfie: { type: Boolean, default: true },
            logicOperator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
            allowPartialSubmission: { type: Boolean, default: false },
        },

        idCardThresholds: {
            minOverallConfidence: { type: Number, default: 0.85 },
            minFullNameConfidence: { type: Number, default: 0.80 },
            minIdentityNumberConfidence: { type: Number, default: 0.90 },
            minDateOfBirthConfidence: { type: Number, default: 0.85 },
            minExpiryDateConfidence: { type: Number, default: 0.85 },
            minMrzConfidence: { type: Number, default: 0.80 },
            minImageQuality: { type: Number, default: 0.60 },
            maxTamperingRisk: { type: Number, default: 0.40 },
            minGenderConfidence: { type: Number, default: 0.75 },
            minSerialNumberConfidence: { type: Number, default: 0.80 },
            acceptableDocumentConditions: { type: [String], default: ['excellent', 'good', 'fair'] },
        },

        selfieThresholds: {
            minMatchConfidence: { type: Number, default: 85 },
            maxSpoofingRisk: { type: Number, default: 0.35 },
            minImageQuality: { type: Number, default: 0.60 },
            minLivenessConfidence: { type: Number, default: 0.70 },
            requiredFaceCount: { type: Number, default: 1 },
            allowedLightingConditions: { type: [String], default: ['excellent', 'good', 'acceptable'] },
            allowedFaceSizes: { type: [String], default: ['optimal', 'adequate'] },
            allowedFaceCoverage: { type: [String], default: ['fully_visible', 'partially_obscured'] },
            minFacialFeatureConfidence: { type: Number, default: 0.70 },
            requireMultipleAngles: { type: Boolean, default: false },
            minAngleDifference: { type: Number, default: 15 },
        },

        validationRules: {
            enforceAgeCheck: { type: Boolean, default: true },
            minAge: { type: Number, default: 18 },
            maxAge: { type: Number, default: 120 },
            enforceExpiryCheck: { type: Boolean, default: true },
            expiryWarningDays: { type: Number, default: 30 },
            enforceTcChecksumValidation: { type: Boolean, default: true },
            enforceMrzCrossValidation: { type: Boolean, default: true },
            requireHologramDetection: { type: Boolean, default: false },
            enforceNameFormat: { type: Boolean, default: true },
            allowDamagedDocuments: { type: Boolean, default: true },
            enforceGenderConsistency: { type: Boolean, default: false },
            maxVerificationRetries: { type: Number, default: 3 },
            retryCooldownMinutes: { type: Number, default: 5 },
        },

        customThresholds: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        isActive: {
            type: Boolean,
            default: true,
        },
        version: {
            type: Number,
            default: 1,
        },
        environment: {
            type: String,
            enum: ['test', 'staging', 'production'],
            default: 'production',
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Unique config per user per country per environment
kycConfigurationSchema.index({ userId: 1, countryCode: 1, environment: 1 }, { unique: true });

export const KycConfiguration = mongoose.model('KycConfiguration', kycConfigurationSchema);
