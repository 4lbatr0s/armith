import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import storageService from './storageService.js';
import logger from '../lib/logger.js';

const MIN_AGE_DAYS_FLOOR = 7;
const DEFAULT_PREFIX = 'kyc-uploads/';
const DEFAULT_MAX_KEYS = 500;
const ABS_MAX_KEYS = 5000;

function readPositiveInt(raw, fallback, cap) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), cap);
}

/** @returns {number | null} */
function readMinAgeDays(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < MIN_AGE_DAYS_FLOOR) return null;
  return Math.floor(n);
}

/**
 * Age-based purge for a single prefix (paginated ListObjects + DeleteObjects batches).
 * Gated off unless R2_LIFECYCLE_PURGE_ENABLED=1 and R2_RETENTION_MIN_AGE_DAYS is set.
 */
export async function runR2RetentionPurgeTick() {
  if (String(process.env.R2_LIFECYCLE_PURGE_ENABLED ?? '').trim() !== '1') {
    return { mode: 'disabled', deleted: 0, scanned: 0 };
  }

  const minAgeDays = readMinAgeDays(process.env.R2_RETENTION_MIN_AGE_DAYS);
  if (minAgeDays == null) {
    logger.warn(
      { minFloorDays: MIN_AGE_DAYS_FLOOR },
      'R2 purge enabled but R2_RETENTION_MIN_AGE_DAYS missing or below floor; skipping purge'
    );
    return { mode: 'blocked_config', deleted: 0, scanned: 0 };
  }

  if (!storageService.isAvailable() || !storageService.client || !storageService.bucketName) {
    logger.warn('R2 purge tick skipped — storage not configured');
    return { mode: 'no_storage', deleted: 0, scanned: 0 };
  }

  const prefix = String(process.env.R2_LIFECYCLE_PREFIX ?? DEFAULT_PREFIX).trim() || DEFAULT_PREFIX;
  const maxKeys = readPositiveInt(
    process.env.R2_LIFECYCLE_PURGE_MAX_KEYS_PER_TICK,
    DEFAULT_MAX_KEYS,
    ABS_MAX_KEYS
  );

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - minAgeDays);

  let scanned = 0;
  let deleted = 0;
  let continuationToken;

  /** @type {{ Key: string }[]} */
  const batchKeys = [];

  const flushDeletes = async () => {
    if (batchKeys.length === 0) return;
    const cmd = new DeleteObjectsCommand({
      Bucket: storageService.bucketName,
      Delete: {
        Objects: batchKeys.splice(0, batchKeys.length),
        Quiet: false
      }
    });
    const out = await storageService.client.send(cmd);
    deleted += out.Deleted?.length ?? 0;
    if (out.Errors?.length) {
      logger.warn({ purgeErrorsSample: out.Errors.slice(0, 5) }, 'R2 purge batch partial errors');
    }
  };

  while (deleted + batchKeys.length < maxKeys) {
    const remainingBudget = maxKeys - deleted - batchKeys.length;
    const pageMax = Math.min(1000, Math.max(1, remainingBudget));

    const listCmd = new ListObjectsV2Command({
      Bucket: storageService.bucketName,
      Prefix: prefix,
      MaxKeys: pageMax,
      ContinuationToken: continuationToken
    });

    const page = await storageService.client.send(listCmd);
    const contents = page.Contents || [];

    if (contents.length === 0 && !page.IsTruncated) {
      break;
    }

    for (const obj of contents) {
      if (!obj.Key || !obj.LastModified) continue;
      scanned += 1;
      if (obj.LastModified >= cutoff) continue;
      batchKeys.push({ Key: obj.Key });
      if (batchKeys.length >= 1000) {
        await flushDeletes();
      }
      if (deleted + batchKeys.length >= maxKeys) {
        await flushDeletes();
        logger.info(
          { scanned, deleted, prefix, cutoff: cutoff.toISOString(), capped: true, maxKeys },
          'R2 retention purge tick completed (per-tick cap reached)'
        );
        return { mode: 'purge', scanned, deleted, capped: true };
      }
    }

    continuationToken = page.NextContinuationToken;
    if (!page.IsTruncated || !continuationToken) {
      break;
    }
  }

  await flushDeletes();
  logger.info(
    { scanned, deleted, prefix, cutoff: cutoff.toISOString(), minAgeDays },
    'R2 retention purge tick completed'
  );
  return { mode: 'purge', scanned, deleted, capped: false };
}
