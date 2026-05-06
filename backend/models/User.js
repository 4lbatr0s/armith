/**
 * User Model
 * API users who authenticate with Clerk
 */

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        lastLoginAt: {
            type: Date,
        },
        providerData: {
            type: mongoose.Schema.Types.Mixed,
        },
        planTier: {
            type: String,
            enum: ['free', 'growth', 'enterprise'],
            default: 'free',
        },
        verificationUsage: {
            currentPeriodCount: {
                type: Number,
                default: 0,
                min: 0,
            },
            periodStart: {
                type: Date,
                default: () => new Date(),
            },
        },
        limitsOverride: {
            monthlyVerificationLimit: {
                type: Number,
                default: null,
            },
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const User = mongoose.model('User', userSchema);
