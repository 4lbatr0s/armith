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
            enum: ['GOOD', 'POOR', 'INSUFFICIENT'],
        },
        faceSize: {
            type: String,
            enum: ['ADEQUATE', 'TOO_SMALL', 'TOO_LARGE'],
        },
        faceCoverage: {
            type: String,
            enum: ['CLEAR', 'PARTIALLY_COVERED', 'FULLY_COVERED'],
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
        rejectionReasons: [String],
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const SelfieValidation = mongoose.model('SelfieValidation', selfieValidationSchema);
