/**
 * IdCardValidation Model
 * ID card verification results
 */

import mongoose from 'mongoose';

const idCardValidationSchema = new mongoose.Schema(
    {
        profileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Profile',
            required: true,
            index: true,
        },
        countryCode: {
            type: String,
            required: true,
        },
        frontImageUrl: {
            type: String,
            required: true,
        },
        backImageUrl: String,

        // Extracted data
        fullName: String,
        identityNumber: String,
        dateOfBirth: Date,
        expiryDate: Date,
        gender: String,
        nationality: String,
        serialNumber: String,
        mrz: mongoose.Schema.Types.Mixed, // Can be string or object with raw/parsed
        mrzInfo: mongoose.Schema.Types.Mixed, // Parsed MRZ data from mrz package
        address: String,

        // Assessment
        documentCondition: {
            type: String,
            enum: ['GOOD', 'DAMAGED', 'POOR'],
        },

        // Confidence scores (0-1)
        fullNameConfidence: Number,
        identityNumberConfidence: Number,
        dateOfBirthConfidence: Number,
        expiryDateConfidence: Number,
        imageQuality: Number,

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

export const IdCardValidation = mongoose.model('IdCardValidation', idCardValidationSchema);
