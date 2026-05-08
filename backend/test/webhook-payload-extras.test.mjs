import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWebhookOptionalData,
  mergeWebhookDataSection,
  normalizeIntegrationWebhookDataFields,
  WEBHOOK_OPTIONAL_DATA_FIELDS
} from '../lib/webhookPayloadExtras.js';

test('normalizeIntegrationWebhookDataFields filters unknown tokens and preserves catalog order', () => {
  const n = normalizeIntegrationWebhookDataFields([
    'metadata',
    'bogus',
    'country',
    'email'
  ]);
  assert.deepEqual(n, ['country', 'email', 'metadata']);
});

test('buildWebhookOptionalData respects allowlist only', () => {
  const profile = {
    _id: 'abc',
    country: 'tr',
    email: 'a@example.com',
    integrationExternalRef: 'ord_1',
    integrationMetadata: { a: '1' },
    createdAt: new Date('2020-01-01T00:00:00.000Z'),
    updatedAt: new Date('2020-01-02T00:00:00.000Z'),
    verificationAttempts: 3,
    fullName: 'Test User'
  };
  assert.deepEqual(
    buildWebhookOptionalData(profile, ['country', 'externalRef']),
    { country: 'TR', externalRef: 'ord_1' }
  );
});

test('mergeWebhookDataSection shallow merges extras', () => {
  assert.deepEqual(
    mergeWebhookDataSection({ profileId: 'x', status: 'APPROVED' }, { country: 'DE' }),
    { profileId: 'x', status: 'APPROVED', country: 'DE' }
  );
});

test('WEBHOOK_OPTIONAL_DATA_FIELDS contains expected identifiers', () => {
  assert.ok(WEBHOOK_OPTIONAL_DATA_FIELDS.includes('externalRef'));
  assert.ok(WEBHOOK_OPTIONAL_DATA_FIELDS.includes('metadata'));
});
