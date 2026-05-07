import mongoose from 'mongoose';

const ttlWebhook = Number(process.env.WEBHOOK_DELIVERY_TTL_SECONDS);
const WEBHOOK_TTL_SEC =
    Number.isFinite(ttlWebhook) && ttlWebhook >= 60 ? Math.floor(ttlWebhook) : null;

const WebhookDeliverySchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', index: true },
        event: { type: String, required: true },
        deliveryId: { type: String, required: true },
        httpStatus: { type: Number },
        errorMessage: { type: String },
        attempts: { type: Number, default: 0 },
        succeeded: { type: Boolean, default: false }
    },
    { timestamps: true, versionKey: false }
);

WebhookDeliverySchema.index({ userId: 1, createdAt: -1 });
if (WEBHOOK_TTL_SEC != null) {
    WebhookDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: WEBHOOK_TTL_SEC });
}

export const WebhookDelivery =
    mongoose.models.WebhookDelivery || mongoose.model('WebhookDelivery', WebhookDeliverySchema);
