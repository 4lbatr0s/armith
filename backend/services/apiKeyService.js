import crypto from 'crypto';
import mongoose from 'mongoose';
import { ApiKey, User } from '../models/index.js';
import { normalizeAllowedCidrs } from '../lib/ipAllowlist.js';
import { canUsePerKeyIpAllowlist } from '../lib/planFeatures.js';

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

function ownerIdVariants(userId) {
  const s = typeof userId === 'string' ? userId.trim() : '';
  if (!s) return [];
  return [s];
}

function ownerFilter(userId) {
  const ids = ownerIdVariants(userId);
  if (ids.length === 0) return { userId: '__none__' };
  return ids.length === 1 ? { userId: ids[0] } : { userId: { $in: ids } };
}

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
  ApiKey.find(ownerFilter(userId)).sort({ createdAt: -1 });

export const updateApiKeyAllowlist = async ({ userId, apiKeyId, allowedCidrs }) => {
  const user = mongoose.Types.ObjectId.isValid(userId)
    ? await User.findById(userId).lean()
    : await User.findOne({ clerkId: userId }).lean();
  if (!canUsePerKeyIpAllowlist(user)) {
    const err = new Error('Per-API-key IP allowlists are available on Growth and Enterprise plans.');
    err.statusCode = 403;
    err.code = 'PLAN_LIMIT_IP_PER_KEY';
    throw err;
  }

  const norm = normalizeAllowedCidrs(allowedCidrs);
  if (!norm.ok) {
    const err = new Error(norm.error || 'Invalid allowlist');
    err.statusCode = 400;
    throw err;
  }

  const apiKey = await ApiKey.findOne({ _id: apiKeyId, ...ownerFilter(userId), revokedAt: null });
  if (!apiKey) return null;

  apiKey.set('allowedCidrs', norm.cidrs);
  await apiKey.save();
  return apiKey;
};

export const revokeApiKeyById = async ({ userId, apiKeyId }) => {
  const apiKey = await ApiKey.findOne({ _id: apiKeyId, ...ownerFilter(userId) });
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
