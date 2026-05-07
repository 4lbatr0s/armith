import mongoose from 'mongoose';

const IdempotencyLedgerSchema = new mongoose.Schema(
    {
        tenantKey: { type: String, required: true },
        routeKey: { type: String, required: true },
        idempotencyKey: { type: String, required: true },
        bodyHash: { type: String, required: true },
        inFlight: { type: Boolean, default: false },
        statusCode: { type: Number },
        responseBody: { type: mongoose.Schema.Types.Mixed },
        expiresAt: { type: Date, required: true }
    },
    { timestamps: false }
);

IdempotencyLedgerSchema.index(
    { tenantKey: 1, routeKey: 1, idempotencyKey: 1 },
    { unique: true }
);

IdempotencyLedgerSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyLedger =
    mongoose.models.IdempotencyLedger || mongoose.model('IdempotencyLedger', IdempotencyLedgerSchema);
