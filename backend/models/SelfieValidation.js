/**
 * SelfieValidation Model
 * Selfie verification results
 */

import mongoose from 'mongoose';

const selfieValidationSchema = new mongoose.Schema(
    {
        profileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Profile',
            required: true,
            index: true,
        },
        idPhotoUrl: {
            type: String,
            required: true,
        },
        selfieUrls: {
            type: [String],
            required: true,
        },

        // Verification results
        isMatch: Boolean,
        matchConfidence: Number, // 0-100
        spoofingRisk: Number, // 0-1
        faceCount: Number,
        imageQualityIssues: [String],

        // Assessment
        lightingCondition: {
            type: String,
            enum: ['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'POOR', 'INSUFFICIENT'],
        },
        faceSize: {
            type: String,
            enum: ['OPTIMAL', 'ADEQUATE', 'TOO_SMALL', 'TOO_LARGE'],
        },
        faceCoverage: {
            type: String,
            enum: ['FULLY_VISIBLE', 'CLEAR', 'PARTIALLY_OBSCURED', 'PARTIALLY_COVERED', 'SIGNIFICANTLY_OBSCURED', 'FULLY_COVERED', 'NOT_VISIBLE'],
        },

        // Confidence scores
        imageQuality: Number,
        faceDetectionConfidence: Number,

        // Validation result
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'UNDER_REVIEW'],
            default: 'PENDING',
        },
        errors: [mongoose.Schema.Types.Mixed],
        rejectionReasons: [mongoose.Schema.Types.Mixed],
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const SelfieValidation = mongoose.model('SelfieValidation', selfieValidationSchema);
