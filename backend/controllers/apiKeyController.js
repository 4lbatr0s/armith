import {
  listApiKeysByUserId,
  createApiKey,
  revokeApiKeyById,
  updateApiKeyAllowlist
} from '../services/apiKeyService.js';
import { User } from '../models/index.js';
import { normalizeAllowedCidrs } from '../lib/ipAllowlist.js';
import { canUsePerKeyIpAllowlist } from '../lib/planFeatures.js';

const mapApiKey = (apiKey) => ({
  id: apiKey._id,
  name: apiKey.name,
  prefix: apiKey.prefix,
  createdAt: apiKey.createdAt,
  lastUsedAt: apiKey.lastUsedAt,
  revokedAt: apiKey.revokedAt,
  allowedCidrs: Array.isArray(apiKey.allowedCidrs) ? apiKey.allowedCidrs : []
});

async function resolveMongoUserFromClerk(clerkId) {
  if (!clerkId) return null;
  const user = await User.findOne({ clerkId }).select('_id planTier limitsOverride apiAllowedCidrs').lean();
  return user || null;
}

export const getApiKeys = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const mongoUser = await resolveMongoUserFromClerk(clerkId);
    if (!mongoUser?._id) {
      return res.status(404).json({ error: 'User not found' });
    }
    const mongoUserId = String(mongoUser._id);
    const [apiKeys, user] = await Promise.all([
      listApiKeysByUserId(mongoUserId),
      User.findById(mongoUserId).lean()
    ]);
    res.json({
      apiKeys: apiKeys.map(mapApiKey),
      features: { perKeyIpAllowlist: canUsePerKeyIpAllowlist(user) }
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
};

export const putAccountApiIpAllowlist = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    const norm = normalizeAllowedCidrs(req.body?.allowedCidrs);
    if (!norm.ok) {
      return res.status(400).json({ error: norm.error || 'Invalid allowlist' });
    }
    const user = clerkId ? await User.findOne({ clerkId }) : null;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.set('apiAllowedCidrs', norm.cidrs);
    await user.save();
    res.json({ apiAllowedCidrs: norm.cidrs });
  } catch (error) {
    console.error('Account API IP allowlist error:', error);
    res.status(500).json({ error: 'Failed to update account allowlist' });
  }
};

export const createApiKeyHandler = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    const mongoUser = await resolveMongoUserFromClerk(clerkId);
    const userId = mongoUser?._id ? String(mongoUser._id) : null;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!name) {
      return res.status(400).json({ error: 'API key name is required' });
    }

    const { token, apiKey } = await createApiKey({ userId, name });

    res.status(201).json({
      apiKey: mapApiKey(apiKey),
      token
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
};

export const patchApiKeyAllowlistHandler = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    const mongoUser = await resolveMongoUserFromClerk(clerkId);
    const userId = mongoUser?._id ? String(mongoUser._id) : null;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const apiKey = await updateApiKeyAllowlist({
        userId,
        apiKeyId: id,
        allowedCidrs: req.body?.allowedCidrs
      });
      if (!apiKey) {
        return res.status(404).json({ error: 'API key not found' });
      }
      res.json({ apiKey: mapApiKey(apiKey) });
    } catch (e) {
      if (e?.statusCode === 400) {
        return res.status(400).json({ error: e.message });
      }
      if (e?.statusCode === 403) {
        return res.status(403).json({ error: e.message, code: e.code || 'PLAN_LIMIT_IP_PER_KEY' });
      }
      throw e;
    }
  } catch (error) {
    console.error('Patch API key allowlist error:', error);
    res.status(500).json({ error: 'Failed to update allowlist' });
  }
};

export const revokeApiKeyHandler = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    const mongoUser = await resolveMongoUserFromClerk(clerkId);
    const userId = mongoUser?._id ? String(mongoUser._id) : null;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const apiKey = await revokeApiKeyById({ userId, apiKeyId: id });
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ apiKey: mapApiKey(apiKey) });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
};
