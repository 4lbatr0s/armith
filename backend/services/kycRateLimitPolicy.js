import { User } from '../models/index.js';

const WINDOW_MS_DEFAULT = 15 * 60 * 1000;

function readPositiveInt(raw, fallback, min = 1, max = 1_000_000) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function readNonNegativeInt(raw, fallback, max = 300_000) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(0, Math.floor(n)));
}

export const KYC_BURST_WINDOW_MS = readPositiveInt(
  process.env.RATE_LIMIT_KYC_WINDOW_MS,
  WINDOW_MS_DEFAULT,
  1000,
  86_400_000
);

const TIER_BURST_DEFAULT = {
  free: readPositiveInt(process.env.RATE_LIMIT_KYC_BURST_FREE, 120),
  growth: readPositiveInt(process.env.RATE_LIMIT_KYC_BURST_GROWTH, 600),
  enterprise: readPositiveInt(process.env.RATE_LIMIT_KYC_BURST_ENTERPRISE, 2500)
};

/** Default per-client-IP ceiling for authenticated KYC routes (same window as burst). */
export const DEFAULT_KYC_PER_IP_LIMIT = readPositiveInt(process.env.RATE_LIMIT_KYC_PER_IP, 800);

let ipOverrideTable = {};
try {
  const raw = typeof process.env.RATE_LIMIT_KYC_IP_OVERRIDES === 'string'
    ? process.env.RATE_LIMIT_KYC_IP_OVERRIDES.trim()
    : '';
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      ipOverrideTable = parsed;
    }
  }
} catch {
  ipOverrideTable = {};
}

const cache = new Map();
const CACHE_TTL_MS = readNonNegativeInt(process.env.RATE_LIMIT_KYC_POLICY_CACHE_MS, 45_000);

/**
 * Pure helper: Mongo user lean doc or null (unknown tenant ⇒ free tier defaults).
 *
 * Override: limitsOverride.kycBurstRequestsPerWindow — max requests per burst window for that tenant's buckets (API keys vs dashboard use separate buckets, same numeric cap).
 *
 * @param {{ planTier?: string, limitsOverride?: { kycBurstRequestsPerWindow?: number | null } } | null} user
 */
export function computeKycBurstLimitFromUserLean(user) {
  const rawOv = user?.limitsOverride?.kycBurstRequestsPerWindow;
  if (rawOv != null) {
    const n = Number(rawOv);
    if (Number.isFinite(n) && n >= 1) {
      return readPositiveInt(n, TIER_BURST_DEFAULT.free);
    }
  }
  const tier = user?.planTier || 'free';
  if (tier === 'growth') return TIER_BURST_DEFAULT.growth;
  if (tier === 'enterprise') return TIER_BURST_DEFAULT.enterprise;
  return TIER_BURST_DEFAULT.free;
}

export function resolveKycPerIpLimit(clientIp) {
  const ip = typeof clientIp === 'string' ? clientIp.trim() : '';
  const fromMap = ip && Object.prototype.hasOwnProperty.call(ipOverrideTable, ip)
    ? Number(ipOverrideTable[ip])
    : NaN;
  if (Number.isFinite(fromMap) && fromMap >= 1) {
    return readPositiveInt(fromMap, DEFAULT_KYC_PER_IP_LIMIT);
  }
  return DEFAULT_KYC_PER_IP_LIMIT;
}

export async function resolveKycBurstLimitForClerkId(clerkId) {
  if (!clerkId || typeof clerkId !== 'string') {
    return TIER_BURST_DEFAULT.free;
  }
  const now = Date.now();
  if (CACHE_TTL_MS > 0) {
    const hit = cache.get(clerkId);
    if (hit && hit.exp > now) {
      return hit.limit;
    }
  }

  const user = await User.findOne({ clerkId }).select('planTier limitsOverride').lean();

  const limit = computeKycBurstLimitFromUserLean(user);

  if (CACHE_TTL_MS > 0) {
    cache.set(clerkId, { limit, exp: now + CACHE_TTL_MS });
    if (cache.size > 5000) {
      for (const [k, v] of cache) {
        if (v.exp <= now) cache.delete(k);
      }
    }
  }

  return limit;
}
