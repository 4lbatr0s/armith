import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runR2RetentionPurgeTick,
  parseLifecyclePrefixes,
  storageKeyFromProfileField,
  isUnresolvedManualReview,
  fetchExemptionKeySets
} from '../services/lifecycleR2Retention.js';

test('parseLifecyclePrefixes: comma-separated R2_LIFECYCLE_PREFIXES', () => {
  assert.deepEqual(
    parseLifecyclePrefixes({
      R2_LIFECYCLE_PREFIXES: 'a/, b/c/',
      R2_LIFECYCLE_PREFIX: 'ignored/'
    }),
    ['a/', 'b/c/']
  );
});

test('parseLifecyclePrefixes: falls back to R2_LIFECYCLE_PREFIX', () => {
  assert.deepEqual(
    parseLifecyclePrefixes({
      R2_LIFECYCLE_PREFIX: 'custom/'
    }),
    ['custom/']
  );
});

test('storageKeyFromProfileField: raw key path without scheme', () => {
  const storage = { extractKeyFromUrl: () => null };
  assert.equal(storageKeyFromProfileField('kyc-uploads/x.jpg', storage), 'kyc-uploads/x.jpg');
});

test('isUnresolvedManualReview: empty trail with queuedAt', () => {
  assert.equal(
    isUnresolvedManualReview({ manualReviewQueuedAt: new Date(), manualReviewAuditTrail: [] }),
    true
  );
});

test('isUnresolvedManualReview: last action QUEUED', () => {
  assert.equal(
    isUnresolvedManualReview({
      manualReviewQueuedAt: new Date(),
      manualReviewAuditTrail: [{ action: 'QUEUED' }]
    }),
    true
  );
});

test('isUnresolvedManualReview: resolved', () => {
  assert.equal(
    isUnresolvedManualReview({
      manualReviewQueuedAt: new Date(),
      manualReviewAuditTrail: [{ action: 'QUEUED' }, { action: 'RESOLVED_APPROVED' }]
    }),
    false
  );
});

test('runR2RetentionPurgeTick: blocked_config when min age below floor', async () => {
  process.env.R2_LIFECYCLE_PURGE_ENABLED = '1';
  process.env.R2_RETENTION_MIN_AGE_DAYS = '3';
  const r = await runR2RetentionPurgeTick({
    storageService: { isAvailable: () => false }
  });
  assert.equal(r.mode, 'blocked_config');
  delete process.env.R2_LIFECYCLE_PURGE_ENABLED;
  delete process.env.R2_RETENTION_MIN_AGE_DAYS;
});

test('runR2RetentionPurgeTick: only objects older than cutoff are deleted', async () => {
  const old = new Date('2000-01-01T00:00:00.000Z');
  const recent = new Date();
  const deleteInputs = [];

  const mockClient = {
    send: async (cmd) => {
      const name = cmd.constructor?.name;
      if (name === 'ListObjectsV2Command') {
        return {
          Contents: [
            { Key: 'kyc-uploads/old.jpg', LastModified: old },
            { Key: 'kyc-uploads/new.jpg', LastModified: recent }
          ],
          IsTruncated: false
        };
      }
      if (name === 'DeleteObjectsCommand') {
        deleteInputs.push(cmd.input.Delete.Objects.map((o) => o.Key));
        return { Deleted: cmd.input.Delete.Objects };
      }
      throw new Error(`unexpected command ${name}`);
    }
  };

  const mockStorage = {
    isAvailable: () => true,
    client: mockClient,
    bucketName: 'bucket',
    extractKeyFromUrl: (u) => {
      try {
        const p = new URL(u).pathname.replace(/^\//, '');
        return p || null;
      } catch {
        return null;
      }
    }
  };

  const Profile = {
    find: () => ({
      select: () => ({
        lean: async () => []
      })
    })
  };

  process.env.R2_LIFECYCLE_PURGE_ENABLED = '1';
  process.env.R2_RETENTION_MIN_AGE_DAYS = '30';
  process.env.R2_LIFECYCLE_PREFIX = 'kyc-uploads/';

  const r = await runR2RetentionPurgeTick({ storageService: mockStorage, Profile });
  assert.equal(r.mode, 'purge');
  assert.equal(r.deleted, 1);
  assert.deepEqual(deleteInputs.flat(), ['kyc-uploads/old.jpg']);

  delete process.env.R2_LIFECYCLE_PURGE_ENABLED;
  delete process.env.R2_RETENTION_MIN_AGE_DAYS;
  delete process.env.R2_LIFECYCLE_PREFIX;
});

test('runR2RetentionPurgeTick: skips keys on legalHold profiles', async () => {
  const old = new Date('2000-01-01T00:00:00.000Z');
  const deleteInputs = [];

  const mockClient = {
    send: async (cmd) => {
      const name = cmd.constructor?.name;
      if (name === 'ListObjectsV2Command') {
        return {
          Contents: [{ Key: 'kyc-uploads/hold.jpg', LastModified: old }],
          IsTruncated: false
        };
      }
      if (name === 'DeleteObjectsCommand') {
        deleteInputs.push(cmd.input.Delete.Objects.map((o) => o.Key));
        return { Deleted: cmd.input.Delete.Objects };
      }
      throw new Error(`unexpected command ${name}`);
    }
  };

  const mockStorage = {
    isAvailable: () => true,
    client: mockClient,
    bucketName: 'bucket',
    extractKeyFromUrl: (u) => {
      try {
        return new URL(u).pathname.replace(/^\//, '');
      } catch {
        return null;
      }
    }
  };

  const Profile = {
    find: () => ({
      select: () => ({
        lean: async () => [
          {
            idFrontImageUrl: 'https://example.com/kyc-uploads/hold.jpg',
            idBackImageUrl: null,
            selfieImageUrl: null,
            legalHold: true,
            manualReviewQueuedAt: null,
            manualReviewAuditTrail: []
          }
        ]
      })
    })
  };

  process.env.R2_LIFECYCLE_PURGE_ENABLED = '1';
  process.env.R2_RETENTION_MIN_AGE_DAYS = '30';
  process.env.R2_LIFECYCLE_PREFIX = 'kyc-uploads/';

  const r = await runR2RetentionPurgeTick({ storageService: mockStorage, Profile });
  assert.equal(r.mode, 'purge');
  assert.equal(r.deleted, 0);
  assert.equal(r.exemptedHold, 1);
  assert.deepEqual(deleteInputs.flat(), []);

  delete process.env.R2_LIFECYCLE_PURGE_ENABLED;
  delete process.env.R2_RETENTION_MIN_AGE_DAYS;
  delete process.env.R2_LIFECYCLE_PREFIX;
});

test('runR2RetentionPurgeTick: per-tick cap on staged old keys', async () => {
  const old = new Date('2000-01-01T00:00:00.000Z');
  const deletedKeys = [];

  const mockClient = {
    send: async (cmd) => {
      const name = cmd.constructor?.name;
      if (name === 'ListObjectsV2Command') {
        return {
          Contents: [
            { Key: 'kyc-uploads/1.jpg', LastModified: old },
            { Key: 'kyc-uploads/2.jpg', LastModified: old },
            { Key: 'kyc-uploads/3.jpg', LastModified: old }
          ],
          IsTruncated: false
        };
      }
      if (name === 'DeleteObjectsCommand') {
        deletedKeys.push(...cmd.input.Delete.Objects.map((o) => o.Key));
        return { Deleted: cmd.input.Delete.Objects };
      }
      throw new Error(`unexpected command ${name}`);
    }
  };

  const mockStorage = {
    isAvailable: () => true,
    client: mockClient,
    bucketName: 'bucket',
    extractKeyFromUrl: () => null
  };

  const Profile = {
    find: () => ({
      select: () => ({
        lean: async () => []
      })
    })
  };

  process.env.R2_LIFECYCLE_PURGE_ENABLED = '1';
  process.env.R2_RETENTION_MIN_AGE_DAYS = '30';
  process.env.R2_LIFECYCLE_PREFIX = 'kyc-uploads/';
  process.env.R2_LIFECYCLE_PURGE_MAX_KEYS_PER_TICK = '2';

  const r = await runR2RetentionPurgeTick({ storageService: mockStorage, Profile });
  assert.equal(r.mode, 'purge');
  assert.equal(r.capped, true);
  assert.equal(r.deleted, 2);
  assert.equal(deletedKeys.length, 2);

  delete process.env.R2_LIFECYCLE_PURGE_ENABLED;
  delete process.env.R2_RETENTION_MIN_AGE_DAYS;
  delete process.env.R2_LIFECYCLE_PREFIX;
  delete process.env.R2_LIFECYCLE_PURGE_MAX_KEYS_PER_TICK;
});

test('fetchExemptionKeySets: manual review unresolved', async () => {
  const storage = {
    extractKeyFromUrl: (u) => new URL(u).pathname.replace(/^\//, '')
  };
  const Profile = {
    find: () => ({
      select: () => ({
        lean: async () => [
          {
            idFrontImageUrl: 'https://x.test/kyc-uploads/m.jpg',
            legalHold: false,
            manualReviewQueuedAt: new Date(),
            manualReviewAuditTrail: [{ action: 'QUEUED' }]
          }
        ]
      })
    })
  };
  const { exemptHold, exemptManual } = await fetchExemptionKeySets(['kyc-uploads/m.jpg'], storage, Profile);
  assert.equal(exemptHold.size, 0);
  assert.ok(exemptManual.has('kyc-uploads/m.jpg'));
});
