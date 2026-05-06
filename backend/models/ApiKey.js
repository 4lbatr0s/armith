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
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

apiKeySchema.index({ userId: 1, revokedAt: 1 });

export const ApiKey = mongoose.model('ApiKey', apiKeySchema);
