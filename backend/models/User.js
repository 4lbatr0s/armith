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
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const User = mongoose.model('User', userSchema);
