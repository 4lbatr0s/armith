/**
 * MongoDB Connection (Mongoose)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kyc';

/**
 * Connect to MongoDB using Mongoose
 */
export async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    try {
        await mongoose.connect(uri);
        console.log('✅ MongoDB connected');
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        throw error;
    }
}

/**
 * Close MongoDB connection
 */
export async function closeDB() {
    await mongoose.disconnect();
}
