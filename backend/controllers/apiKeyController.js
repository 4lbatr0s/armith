import {
  listApiKeysByUserId,
  createApiKey,
  revokeApiKeyById,
  updateApiKeyAllowlist
} from '../services/apiKeyService.js';

const mapApiKey = (apiKey) => ({
  id: apiKey._id,
  name: apiKey.name,
  prefix: apiKey.prefix,
  createdAt: apiKey.createdAt,
  lastUsedAt: apiKey.lastUsedAt,
  revokedAt: apiKey.revokedAt,
  allowedCidrs: Array.isArray(apiKey.allowedCidrs) ? apiKey.allowedCidrs : []
});

export const getApiKeys = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const apiKeys = await listApiKeysByUserId(userId);
    res.json({ apiKeys: apiKeys.map(mapApiKey) });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
};

export const createApiKeyHandler = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

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
    const userId = req.auth?.userId;
    const { id } = req.params;

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
      throw e;
    }
  } catch (error) {
    console.error('Patch API key allowlist error:', error);
    res.status(500).json({ error: 'Failed to update allowlist' });
  }
};

export const revokeApiKeyHandler = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;

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
