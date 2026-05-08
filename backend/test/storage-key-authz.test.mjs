import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeObjectKey,
  isStorageKeyOwnedByTenant,
  isLegacyKycUploadsKey
} from '../lib/storageKeyAuthz.js';

test('normalizeObjectKey rejects traversal', () => {
  assert.equal(normalizeObjectKey('../../etc/passwd'), null);
  assert.equal(normalizeObjectKey('users/a/../b'), null);
});

test('normalizeObjectKey strips leading slashes', () => {
  assert.equal(normalizeObjectKey('/users/t1/x.jpg'), 'users/t1/x.jpg');
});

test('isStorageKeyOwnedByTenant', () => {
  assert.equal(isStorageKeyOwnedByTenant('users/tenant1/id-front.jpg', 'tenant1'), true);
  assert.equal(isStorageKeyOwnedByTenant('users/tenant2/id-front.jpg', 'tenant1'), false);
  assert.equal(isStorageKeyOwnedByTenant('kyc-uploads/x.jpg', 'tenant1'), false);
});

test('isLegacyKycUploadsKey', () => {
  assert.equal(isLegacyKycUploadsKey('kyc-uploads/uuid.jpg'), true);
  assert.equal(isLegacyKycUploadsKey('users/a/b.jpg'), false);
});
