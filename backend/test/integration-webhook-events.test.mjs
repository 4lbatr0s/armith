import test from 'node:test';
import assert from 'node:assert/strict';

import {
  allOutboundWebhookEventTypes,
  normalizeOutboundWebhookSubscriptions,
  outboundWebhookAllowsEvent,
  resolveOutboundWebhookSubscriptionsForPublic
} from '../lib/integrationWebhookEvents.js';

test('normalizeOutboundWebhookSubscriptions ignores unknown tokens and preserves catalog order', () => {
  const n = normalizeOutboundWebhookSubscriptions([
    'verification.completed',
    'bogus',
    'verification.manual_review_queued'
  ]);
  assert.deepEqual(n, ['verification.manual_review_queued', 'verification.completed']);
});

test('outboundWebhookAllowsEvent: legacy unspecified → all allowed', () => {
  assert.equal(outboundWebhookAllowsEvent({}, 'verification.completed'), true);
});

test('outboundWebhookAllowsEvent: empty persisted array disables', () => {
  assert.equal(
    outboundWebhookAllowsEvent({ integrationWebhookEvents: [] }, 'verification.completed'),
    false
  );
});

test('outboundWebhookAllowsEvent: respects subset', () => {
  const cfg = { integrationWebhookEvents: ['verification.completed'] };
  assert.equal(outboundWebhookAllowsEvent(cfg, 'verification.completed'), true);
  assert.equal(outboundWebhookAllowsEvent(cfg, 'verification.failed'), false);
});

test('resolveOutboundWebhookSubscriptionsForPublic expands legacy omission', () => {
  assert.deepEqual(resolveOutboundWebhookSubscriptionsForPublic(undefined), allOutboundWebhookEventTypes());
});

test('replay bypass skips subscription gate', () => {
  assert.equal(
    outboundWebhookAllowsEvent(
      { integrationWebhookEvents: [] },
      'verification.completed',
      { bypassSubscription: true }
    ),
    true
  );
});
