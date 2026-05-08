import logger from '../lib/logger.js';
import { Profile } from '../models/Profile.js';

const TERMINAL_STATUSES = ['APPROVED', 'REJECTED', 'FAILED'];

function readAgeDays(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

/**
 * Read-only report: counts terminal profiles with updatedAt older than N days.
 * No writes. Omit MONGO_PROFILE_AGE_DAYS to skip.
 *
 * @param {{ Profile?: typeof Profile }} [deps]
 */
export async function runMongoProfileRetentionReport(deps = {}) {
  const ProfileModel = deps.Profile ?? Profile;
  const days = readAgeDays(process.env.MONGO_PROFILE_AGE_DAYS);
  if (days == null) {
    return { mode: 'skipped', reason: 'MONGO_PROFILE_AGE_DAYS unset or invalid' };
  }

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);

  const rows = await ProfileModel.aggregate([
    {
      $match: {
        status: { $in: TERMINAL_STATUSES },
        updatedAt: { $lt: cutoff }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  /** @type {Record<string, number>} */
  const byStatus = {};
  let total = 0;
  for (const row of rows) {
    const k = String(row._id ?? '');
    byStatus[k] = row.count;
    total += row.count;
  }

  logger.info(
    { mongoProfileRetentionReport: true, days, cutoff: cutoff.toISOString(), total, byStatus },
    'Mongo profile retention report (read-only; no deletes)'
  );

  return { mode: 'report', days, cutoff: cutoff.toISOString(), total, byStatus };
}
