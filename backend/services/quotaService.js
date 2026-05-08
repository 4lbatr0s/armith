import mongoose from 'mongoose';
import { User } from '../models/index.js';

/** Monthly app-enforced caps (Stripe metering is separate). Growth is metered with overage in product copy — do not hard-stop at the discounted tier band. */
const PLAN_LIMITS = {
  free: 20,
  growth: null,
  enterprise: null
};

const getPeriodStart = (value = new Date()) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));

const isSamePeriod = (a, b) =>
  a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();

const getLimitForUser = (user) => {
  if (typeof user?.limitsOverride?.monthlyVerificationLimit === 'number') {
    return user.limitsOverride.monthlyVerificationLimit;
  }
  return PLAN_LIMITS[user?.planTier || 'free'];
};

const ensureUsagePeriod = async (user) => {
  const nowPeriodStart = getPeriodStart();
  const existingPeriodStart = user.verificationUsage?.periodStart
    ? new Date(user.verificationUsage.periodStart)
    : nowPeriodStart;

  if (!isSamePeriod(existingPeriodStart, nowPeriodStart)) {
    user.verificationUsage = {
      currentPeriodCount: 0,
      periodStart: nowPeriodStart
    };
    await user.save();
  }

  return user;
};

export const getOrCreateUsageUser = async (clerkId) => {
  if (!clerkId) return null;

  let user = await User.findOne({ clerkId });
  if (!user) {
    user = await User.create({
      clerkId,
      lastLoginAt: new Date(),
      planTier: 'free',
      verificationUsage: {
        currentPeriodCount: 0,
        periodStart: getPeriodStart()
      }
    });
  }
  return ensureUsagePeriod(user);
};

/** @param {string | undefined | null} mongoUserId Hex ObjectId string for `users` collection */
export const checkUserVerificationQuota = async (mongoUserId) => {
  if (!mongoUserId || !mongoose.Types.ObjectId.isValid(mongoUserId)) {
    return { allowed: false, used: 0, limit: 0, planTier: 'free', user: null };
  }
  let user = await User.findById(mongoUserId);
  if (!user) {
    return { allowed: false, used: 0, limit: 0, planTier: 'free', user: null };
  }
  user = await ensureUsagePeriod(user);
  const limit = getLimitForUser(user);
  const used = user.verificationUsage?.currentPeriodCount || 0;
  const isUnlimited = limit == null;
  const allowed = isUnlimited || used < limit;

  return {
    allowed,
    used,
    limit,
    planTier: user.planTier,
    user
  };
};

/** @param {string | undefined | null} mongoUserId Hex ObjectId string for `users` collection */
export const incrementUserVerificationUsage = async (mongoUserId) => {
  if (!mongoUserId || !mongoose.Types.ObjectId.isValid(mongoUserId)) return null;
  const user = await User.findById(mongoUserId);
  if (!user) return null;
  user.verificationUsage = user.verificationUsage || {};
  user.verificationUsage.currentPeriodCount = (user.verificationUsage.currentPeriodCount || 0) + 1;
  await user.save();
  return user.verificationUsage.currentPeriodCount;
};
