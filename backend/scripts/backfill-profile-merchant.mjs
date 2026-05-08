/**
 * Optional one-off backfill for single-tenant deployments:
 * Sets `merchantUserId` where missing using MERCHANT_BACKFILL_CLERK_ID (Clerk dashboard user id).
 *
 * Usage (from backend/): MERCHANT_BACKFILL_CLERK_ID=user_xx node scripts/backfill-profile-merchant.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const clerkId = String(process.env.MERCHANT_BACKFILL_CLERK_ID ?? '').trim();
if (!clerkId) {
    console.error('Set MERCHANT_BACKFILL_CLERK_ID to your tenant Clerk user id');
    process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI required');
    process.exit(1);
}

async function main() {
    await mongoose.connect(uri);
    const col = mongoose.connection.collection('profiles');
    const result = await col.updateMany(
        {
            $or: [{ merchantUserId: { $exists: false } }, { merchantUserId: null }, { merchantUserId: '' }]
        },
        { $set: { merchantUserId: clerkId } }
    );
    console.log('Matched:', result.matchedCount, 'Modified:', result.modifiedCount);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
