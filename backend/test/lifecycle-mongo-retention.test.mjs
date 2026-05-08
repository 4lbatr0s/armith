import test from 'node:test';
import assert from 'node:assert/strict';
import { runMongoProfileRetentionReport } from '../services/lifecycleMongoRetention.js';

test('runMongoProfileRetentionReport: skipped when MONGO_PROFILE_AGE_DAYS unset', async () => {
  delete process.env.MONGO_PROFILE_AGE_DAYS;
  const r = await runMongoProfileRetentionReport({
    Profile: {
      aggregate: async () => {
        throw new Error('should not run');
      }
    }
  });
  assert.equal(r.mode, 'skipped');
});

test('runMongoProfileRetentionReport: aggregates by status', async () => {
  process.env.MONGO_PROFILE_AGE_DAYS = '90';
  const Profile = {
    aggregate: async () => [
      { _id: 'APPROVED', count: 2 },
      { _id: 'FAILED', count: 1 }
    ]
  };
  const r = await runMongoProfileRetentionReport({ Profile });
  assert.equal(r.mode, 'report');
  assert.equal(r.total, 3);
  assert.equal(r.byStatus.APPROVED, 2);
  assert.equal(r.byStatus.FAILED, 1);
  delete process.env.MONGO_PROFILE_AGE_DAYS;
});
