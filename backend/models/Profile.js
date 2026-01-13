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
