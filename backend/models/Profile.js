/**
 * Profile Model
 * End customers going through KYC verification
 */

import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            index: true,
        },
        fullName: String,
        firstName: String,
        lastName: String,
        identityNumber: String,
        dateOfBirth: Date,
        gender: String,
        nationality: String,
        country: String,
        email: {
            type: String,
            lowercase: true,
            trim: true,
        },
        phoneNumber: String,
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'UNDER_REVIEW'],
            default: 'PENDING',
        },
        // Verification statuses (synced from IdCardValidation and SelfieValidation)
        idVerificationStatus: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'UNDER_REVIEW', null],
            default: null,
        },
        selfieVerificationStatus: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'UNDER_REVIEW', null],
            default: null,
        },

        // Additional ID card information (from IdCardValidation)
        serialNumber: String, // Document serial number
        expiryDate: Date, // Document expiry date
        address: String, // Address from ID card
        documentCondition: {
            type: String,
            enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', null],
            default: null,
        },

        // Confidence scores summary (for quick access)
        overallConfidence: {
            type: Number,
            min: 0,
            max: 1,
        }, // Overall confidence from ID verification

        // Selfie verification summary
        selfieMatchConfidence: {
            type: Number,
            min: 0,
            max: 100,
        }, // Face match confidence (0-100)
        selfieSpoofingRisk: {
            type: Number,
            min: 0,
            max: 1,
        }, // Spoofing risk (0-1)

        // Image URLs (quick access without joining)
        idFrontImageUrl: String,
        idBackImageUrl: String,
        selfieImageUrl: String, // Primary selfie image

        // Verification metadata
        verificationAttempts: {
            type: Number,
            default: 0,
        }, // Number of verification attempts
        lastVerificationAttempt: Date, // Last verification attempt timestamp
        rejectionReasons: [mongoose.Schema.Types.Mixed], // Structured rejection reasons with code and field

        // Additional metadata
        notes: String, // Admin notes about this profile
        tags: [String], // Tags for categorization/filtering

        /** When true, R2 retention purge skips objects linked on this profile (litigation / subpoena). */
        legalHold: { type: Boolean, default: false, index: true },

        manualReviewQueuedAt: { type: Date, default: null },
        manualReviewDeadlineAt: { type: Date, default: null },
        manualReviewAssigneeLabel: { type: String, maxlength: 160, trim: true, default: '' },
        manualReviewAssignedAt: { type: Date, default: null },
        manualReviewAuditTrail: [
            {
                action: {
                    type: String,
                    enum: ['QUEUED', 'RESOLVED_APPROVED', 'RESOLVED_REJECTED'],
                    required: true
                },
                at: { type: Date, default: Date.now },
                actorUserId: { type: String, default: '' },
                assigneeLabel: { type: String, maxlength: 160, trim: true, default: '' },
                note: { type: String, maxlength: 300, trim: true, default: '' }
            }
        ]
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Compound unique index - only when identityNumber is not null
// Using partial index to avoid duplicate key errors with null values
profileSchema.index(
    { country: 1, identityNumber: 1 },
    {
        unique: true,
        partialFilterExpression: { identityNumber: { $ne: null } }
    }
);

export const Profile = mongoose.model('Profile', profileSchema);
