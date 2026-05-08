import logger from '../lib/logger.js';
import { runR2RetentionPurgeTick } from './lifecycleR2Retention.js';
import { runMongoProfileRetentionReport } from './lifecycleMongoRetention.js';

function parseIntervalMinutes(raw, fallbackMinutes) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackMinutes;
  return Math.min(parsed, 24 * 60);
}

function withSafeJob(name, fn) {
  return async () => {
    try {
      await fn();
    } catch (error) {
      logger.warn({ err: error, job: name }, 'Lifecycle job tick failed');
    }
  };
}

async function runR2LifecycleTick() {
  const result = await runR2RetentionPurgeTick();
  if (result.mode === 'purge') {
    return;
  }
  if (result.mode === 'blocked_config') {
    return;
  }
  if (result.mode === 'no_storage') {
    logger.info('R2 lifecycle tick skipped — purge wanted but storage is not configured');
    return;
  }
  logger.info('R2 lifecycle dry-run tick (no deletions; set R2_LIFECYCLE_PURGE_ENABLED=1 + R2_RETENTION_MIN_AGE_DAYS for capped purge)');
}

async function runMongoLifecycleTick() {
  const ttl = Number(process.env.WEBHOOK_DELIVERY_TTL_SECONDS);
  if (Number.isFinite(ttl) && ttl >= 60) {
    logger.info({ webhookDeliveryTtlSeconds: ttl }, 'Mongo lifecycle tick — WebhookDelivery TTL index active via env');
  } else {
    logger.info('Mongo lifecycle dry-run tick — WEBHOOK_DELIVERY_TTL_SECONDS not set (<60 omitted); broader profile TTL/archival deferred (see docs/RETENTION_DECISION_CHECKLIST.md)');
  }
  await runMongoProfileRetentionReport();
}

function startIntervalJob(name, minutes, fn) {
  const periodMs = minutes * 60 * 1000;
  logger.info({ job: name, everyMinutes: minutes }, 'Lifecycle job scheduled');
  const tid = setInterval(withSafeJob(name, fn), periodMs);
  return () => clearInterval(tid);
}

/**
 * Lifecycle scheduler wiring.
 * R2 purge is opt-in (`R2_LIFECYCLE_PURGE_ENABLED`) and capped per tick; objects linked on `legalHold` or unresolved manual review are skipped (`docs/RETENTION_DECISION_CHECKLIST.md`).
 */
export function startLifecycleSchedulers() {
  const stoppers = [];
  const r2Cron = String(process.env.R2_LIFECYCLE_CRON ?? '').trim();
  if (r2Cron) {
    const mins = parseIntervalMinutes(process.env.R2_LIFECYCLE_INTERVAL_MINUTES, 60);
    stoppers.push(startIntervalJob('r2-lifecycle', mins, runR2LifecycleTick));
  }

  const mongoCron = String(process.env.MONGO_LIFECYCLE_CRON ?? '').trim();
  if (mongoCron) {
    const mins = parseIntervalMinutes(process.env.MONGO_LIFECYCLE_INTERVAL_MINUTES, 60);
    stoppers.push(startIntervalJob('mongo-lifecycle', mins, runMongoLifecycleTick));
  }

  if (stoppers.length === 0) {
    logger.info('Lifecycle schedulers disabled (set R2_LIFECYCLE_CRON or MONGO_LIFECYCLE_CRON to enable ticks)');
  }

  return () => {
    for (const stop of stoppers) stop();
  };
}
