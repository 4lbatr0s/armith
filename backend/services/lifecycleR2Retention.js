import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import storageService from './storageService.js';
import { Profile } from '../models/Profile.js';
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
 * @param {NodeJS.ProcessEnv} env
 * @returns {string[]}
 */
export function parseLifecyclePrefixes(env = process.env) {
  const multi = String(env.R2_LIFECYCLE_PREFIXES ?? '').trim();
  if (multi) {
    return multi
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
  }
  const single = String(env.R2_LIFECYCLE_PREFIX ?? DEFAULT_PREFIX).trim() || DEFAULT_PREFIX;
  return [single];
}

/**
 * @param {string | null | undefined} raw
 * @param {{ extractKeyFromUrl: (u: string) => string | null }} storage
 */
export function storageKeyFromProfileField(raw, storage) {
  if (!raw || typeof raw !== 'string') return null;
  const fromUrl = storage.extractKeyFromUrl(raw);
  if (fromUrl) return fromUrl;
  if (!raw.includes('://')) return raw.replace(/^\//, '');
  return null;
}

/**
 * Unresolved manual review: queued timestamp set and audit trail ends in QUEUED or is empty.
 * @param {{ manualReviewQueuedAt?: Date | null, manualReviewAuditTrail?: { action?: string }[] }} profile
 */
export function isUnresolvedManualReview(profile) {
  if (profile.manualReviewQueuedAt == null) return false;
  const trail = profile.manualReviewAuditTrail;
  if (!Array.isArray(trail) || trail.length === 0) return true;
  const last = trail[trail.length - 1]?.action;
  return last === 'QUEUED';
}

/**
 * @param {string[]} candidateKeys object keys in the delete batch
 * @param {{ extractKeyFromUrl: (u: string) => string | null }} storage
 * @param {typeof Profile} ProfileModel
 */
export async function fetchExemptionKeySets(candidateKeys, storage, ProfileModel) {
  const keySet = new Set(candidateKeys);
  const exemptHold = new Set();
  const exemptManual = new Set();
  if (keySet.size === 0) return { exemptHold, exemptManual };

  const profiles = await ProfileModel.find({
    $and: [
      {
        $or: [{ legalHold: true }, { manualReviewQueuedAt: { $ne: null } }]
      },
      {
        $or: [
          { idFrontImageUrl: { $nin: [null, ''] } },
          { idBackImageUrl: { $nin: [null, ''] } },
          { selfieImageUrl: { $nin: [null, ''] } }
        ]
      }
    ]
  })
    .select(
      'idFrontImageUrl idBackImageUrl selfieImageUrl legalHold manualReviewQueuedAt manualReviewAuditTrail'
    )
    .lean();

  for (const p of profiles) {
    const urls = [p.idFrontImageUrl, p.idBackImageUrl, p.selfieImageUrl];
    /** @type {Set<string>} */
    const keysFromProfile = new Set();
    for (const u of urls) {
      const k = storageKeyFromProfileField(u, storage);
      if (k && keySet.has(k)) keysFromProfile.add(k);
    }
    if (keysFromProfile.size === 0) continue;
    const unresolved = isUnresolvedManualReview(p);
    for (const k of keysFromProfile) {
      if (p.legalHold) exemptHold.add(k);
      else if (unresolved) exemptManual.add(k);
    }
  }

  return { exemptHold, exemptManual };
}

/**
 * Age-based purge across configured prefixes (paginated ListObjects + DeleteObjects batches).
 * Gated off unless R2_LIFECYCLE_PURGE_ENABLED=1 and R2_RETENTION_MIN_AGE_DAYS is set.
 *
 * @param {{ storageService?: typeof storageService, Profile?: typeof Profile }} [deps]
 */
export async function runR2RetentionPurgeTick(deps = {}) {
  const ss = deps.storageService ?? storageService;
  const ProfileModel = deps.Profile ?? Profile;

  if (String(process.env.R2_LIFECYCLE_PURGE_ENABLED ?? '').trim() !== '1') {
    return {
      mode: 'disabled',
      deleted: 0,
      scanned: 0,
      exemptedHold: 0,
      exemptedManualReview: 0,
      prefixes: [],
      capped: false
    };
  }

  const minAgeDays = readMinAgeDays(process.env.R2_RETENTION_MIN_AGE_DAYS);
  if (minAgeDays == null) {
    logger.warn(
      { minFloorDays: MIN_AGE_DAYS_FLOOR },
      'R2 purge enabled but R2_RETENTION_MIN_AGE_DAYS missing or below floor; skipping purge'
    );
    return {
      mode: 'blocked_config',
      deleted: 0,
      scanned: 0,
      exemptedHold: 0,
      exemptedManualReview: 0,
      prefixes: [],
      capped: false
    };
  }

  if (!ss.isAvailable() || !ss.client || !ss.bucketName) {
    logger.warn('R2 purge tick skipped — storage not configured');
    return {
      mode: 'no_storage',
      deleted: 0,
      scanned: 0,
      exemptedHold: 0,
      exemptedManualReview: 0,
      prefixes: [],
      capped: false
    };
  }

  const prefixes = parseLifecyclePrefixes(process.env);
  const maxKeys = readPositiveInt(
    process.env.R2_LIFECYCLE_PURGE_MAX_KEYS_PER_TICK,
    DEFAULT_MAX_KEYS,
    ABS_MAX_KEYS
  );

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - minAgeDays);

  let scanned = 0;
  let deleted = 0;
  let exemptedHold = 0;
  let exemptedManualReview = 0;
  let capped = false;
  /** Old keys queued for this tick (incl. exempt); caps work per tick independent of exemption. */
  let stagedOldKeys = 0;

  /** @type {{ Key: string }[]} */
  const batchKeys = [];

  const flushDeletes = async () => {
    if (batchKeys.length === 0) return;
    const stringKeys = batchKeys.map((b) => b.Key);
    const { exemptHold, exemptManual } = await fetchExemptionKeySets(stringKeys, ss, ProfileModel);

    /** @type {{ Key: string }[]} */
    const toSend = [];
    for (const b of batchKeys) {
      if (exemptHold.has(b.Key)) {
        exemptedHold += 1;
        continue;
      }
      if (exemptManual.has(b.Key)) {
        exemptedManualReview += 1;
        continue;
      }
      toSend.push(b);
    }
    batchKeys.length = 0;

    if (toSend.length === 0) return;

    const cmd = new DeleteObjectsCommand({
      Bucket: ss.bucketName,
      Delete: {
        Objects: toSend,
        Quiet: false
      }
    });
    const out = await ss.client.send(cmd);
    deleted += out.Deleted?.length ?? 0;
    if (out.Errors?.length) {
      logger.warn({ purgeErrorsSample: out.Errors.slice(0, 5) }, 'R2 purge batch partial errors');
    }
  };

  const finishCap = async () => {
    await flushDeletes();
    capped = true;
    logger.info(
      {
        scanned,
        deleted,
        exemptedHold,
        exemptedManualReview,
        prefixes,
        cutoff: cutoff.toISOString(),
        capped: true,
        maxKeys,
        minAgeDays,
        stagedOldKeys
      },
      'R2 retention purge tick completed (per-tick cap reached)'
    );
    return {
      mode: 'purge',
      scanned,
      deleted,
      exemptedHold,
      exemptedManualReview,
      prefixes,
      capped: true
    };
  };

  for (const prefix of prefixes) {
    let continuationToken;

    while (stagedOldKeys < maxKeys) {
      const remainingBudget = maxKeys - stagedOldKeys;
      const pageMax = Math.min(1000, Math.max(1, remainingBudget));

      const listCmd = new ListObjectsV2Command({
        Bucket: ss.bucketName,
        Prefix: prefix,
        MaxKeys: pageMax,
        ContinuationToken: continuationToken
      });

      const page = await ss.client.send(listCmd);
      const contents = page.Contents || [];

      if (contents.length === 0 && !page.IsTruncated) {
        break;
      }

      for (const obj of contents) {
        if (!obj.Key || !obj.LastModified) continue;
        scanned += 1;
        if (obj.LastModified >= cutoff) continue;
        stagedOldKeys += 1;
        batchKeys.push({ Key: obj.Key });
        if (batchKeys.length >= 1000) {
          await flushDeletes();
        }
        if (stagedOldKeys >= maxKeys) {
          return await finishCap();
        }
      }

      continuationToken = page.NextContinuationToken;
      if (!page.IsTruncated || !continuationToken) {
        break;
      }
    }
  }

  await flushDeletes();
  logger.info(
    {
      scanned,
      deleted,
      exemptedHold,
      exemptedManualReview,
      prefixes,
      cutoff: cutoff.toISOString(),
      capped: false,
      minAgeDays,
      stagedOldKeys
    },
    'R2 retention purge tick completed'
  );
  return {
    mode: 'purge',
    scanned,
    deleted,
    exemptedHold,
    exemptedManualReview,
    prefixes,
    capped: false
  };
}
