import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    prefix: {
      type: String,
      required: true,
      index: true
    },
    keyHash: {
      type: String,
      required: true,
      unique: true
    },
    lastUsedAt: {
      type: Date,
      default: null
    },
    revokedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    /** When non-empty, `X-API-Key` auth is rejected unless client IP matches (IPv4 + CIDR, or exact IPv6). */
    allowedCidrs: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

apiKeySchema.index({ userId: 1, revokedAt: 1 });

export const ApiKey = mongoose.model('ApiKey', apiKeySchema);
