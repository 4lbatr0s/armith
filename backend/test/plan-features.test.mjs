import test from 'node:test';
import assert from 'node:assert/strict';
import { canUsePerKeyIpAllowlist } from '../lib/planFeatures.js';

test('per-key IP allowlist: free is false', () => {
  assert.equal(canUsePerKeyIpAllowlist({ planTier: 'free' }), false);
  assert.equal(canUsePerKeyIpAllowlist(null), false);
});

test('per-key IP allowlist: growth and enterprise true', () => {
  assert.equal(canUsePerKeyIpAllowlist({ planTier: 'growth' }), true);
  assert.equal(canUsePerKeyIpAllowlist({ planTier: 'enterprise' }), true);
});
