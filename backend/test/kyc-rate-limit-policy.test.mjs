import test from 'node:test';
import assert from 'node:assert/strict';
import { computeKycBurstLimitFromUserLean } from '../services/kycRateLimitPolicy.js';

test('burst: null user matches explicit free tier', () => {
  assert.equal(
    computeKycBurstLimitFromUserLean(null),
    computeKycBurstLimitFromUserLean({ planTier: 'free' })
  );
});

test('burst: per-user override wins when valid', () => {
  assert.equal(
    computeKycBurstLimitFromUserLean({
      planTier: 'free',
      limitsOverride: { kycBurstRequestsPerWindow: 42 }
    }),
    42
  );
});

test('burst: invalid override ignored (use tier)', () => {
  const base = computeKycBurstLimitFromUserLean({ planTier: 'enterprise' });
  assert.equal(
    computeKycBurstLimitFromUserLean({
      planTier: 'enterprise',
      limitsOverride: { kycBurstRequestsPerWindow: 0 }
    }),
    base
  );
});

test('burst: growth default is not below free default (typical env)', () => {
  const g = computeKycBurstLimitFromUserLean({ planTier: 'growth' });
  const f = computeKycBurstLimitFromUserLean({ planTier: 'free' });
  assert.ok(g >= f, `expected growth (${g}) >= free (${f})`);
});
