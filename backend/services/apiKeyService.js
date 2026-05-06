import crypto from 'crypto';
import { ApiKey } from '../models/index.js';

const API_KEY_PREFIX = 'ak_live_';
const TOKEN_BYTES = 24;
const PREFIX_BYTES = 4;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const safeCompare = (a, b) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

export const createApiKey = async ({ userId, name }) => {
  const token = `${API_KEY_PREFIX}${crypto.randomBytes(TOKEN_BYTES).toString('hex')}`;
  const prefix = `${API_KEY_PREFIX}${crypto.randomBytes(PREFIX_BYTES).toString('hex')}`;
  const keyHash = hashToken(token);

  const apiKey = await ApiKey.create({
    userId,
    name,
    prefix,
    keyHash
  });

  return {
    id: apiKey._id,
    token,
    apiKey
  };
};

export const listApiKeysByUserId = async (userId) =>
  ApiKey.find({ userId }).sort({ createdAt: -1 });

export const revokeApiKeyById = async ({ userId, apiKeyId }) => {
  const apiKey = await ApiKey.findOne({ _id: apiKeyId, userId });
  if (!apiKey) return null;

  if (!apiKey.revokedAt) {
    apiKey.revokedAt = new Date();
    await apiKey.save();
  }

  return apiKey;
};

export const authenticateApiKeyToken = async (token) => {
  if (!token || typeof token !== 'string' || !token.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const hashedInput = hashToken(token);
  const apiKey = await ApiKey.findOne({ keyHash: hashedInput, revokedAt: null });
  if (!apiKey) return null;

  if (!safeCompare(apiKey.keyHash, hashedInput)) return null;

  apiKey.lastUsedAt = new Date();
  await apiKey.save();

  return apiKey;
};
