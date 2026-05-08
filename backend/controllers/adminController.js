/**
 * Admin Controller
 * Admin endpoints for viewing verifications and managing settings
 */

import mongoose from 'mongoose';
import { ERRORS, STATUS } from '../kyc/config.js';
import { Profile, IdCardValidation, SelfieValidation, KycConfiguration, WebhookDelivery, ApiKey } from '../models/index.js';
import { createDefaultConfig, PRESETS } from '../kyc/defaults.js';
import { resolveKycConfig } from '../thresholds/resolve.js';
import { flattenedThresholdPayload, applyFlatThresholdPatches } from '../thresholds/api-shape.js';
import { purgeVerificationStorageForProfile } from '../services/kyc/purgeVerificationObjects.js';
import {
  emitManualReviewQueuedWebhook,
  emitManualReviewResolvedWebhook,
  emitVerificationTerminalWebhook
} from '../services/verificationWebhook.js';
import { incrementUserVerificationUsage } from '../services/quotaService.js';
import { mintCaptureSessionToken } from '../lib/captureSessionToken.js';
import {
  normalizeOutboundWebhookSubscriptions,
  resolveOutboundWebhookSubscriptionsForPublic
} from '../lib/integrationWebhookEvents.js';

const MAX_INTEGRATION_WEBHOOK_URL = 2048;
const MAX_INTEGRATION_WEBHOOK_SECRET = 512;

const PROFILE_QUERY_STATUSES = new Set([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'FAILED',
  'UNDER_REVIEW'
]);

/**
 * Payload for GET/PUT `/admin/settings` — never exposes `integrationWebhookSecret`.
 */
function buildPublicSettingsFromConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') {
    throw new Error('buildPublicSettingsFromConfig: invalid config document');
  }
  const oc = typeof cfg.toObject === 'function' ? { ...cfg.toObject() } : { ...(cfg || {}) };
  const secretVal = oc.integrationWebhookSecret;
  const hasWebhookSecret =
    typeof secretVal === 'string'
      ? secretVal.trim().length > 0
      : Boolean(secretVal);
  delete oc.integrationWebhookSecret;
  return {
    verificationRules: oc.verificationSteps ?? {},
    thresholds: flattenedThresholdPayload(resolveKycConfig(oc)),
    integration: {
      webhookUrl: oc.integrationWebhookUrl ? String(oc.integrationWebhookUrl).trim() : '',
      hasWebhookSecret,
      webhookEvents: resolveOutboundWebhookSubscriptionsForPublic(oc.integrationWebhookEvents)
    },
    metadata: oc.updatedAt ? { lastUpdated: oc.updatedAt } : undefined
  };
}

function mapProfileDashboardRow(p) {
  return {
    id: p._id,
    fullName: p.fullName,
    identityNumber: p.identityNumber,
    dateOfBirth: p.dateOfBirth,
    gender: p.gender,
    nationality: p.nationality,
    country: p.country,
    status: p.status,
    createdAt: p.createdAt,
    serialNumber: p.serialNumber,
    expiryDate: p.expiryDate,
    address: p.address,
    documentCondition: p.documentCondition,
    overallConfidence: p.overallConfidence,
    selfieMatchConfidence: p.selfieMatchConfidence,
    selfieSpoofingRisk: p.selfieSpoofingRisk,
    idFrontImageUrl: p.idFrontImageUrl,
    idBackImageUrl: p.idBackImageUrl,
    selfieImageUrl: p.selfieImageUrl,
    verificationAttempts: p.verificationAttempts || 0,
    lastVerificationAttempt: p.lastVerificationAttempt,
    rejectionReasons: p.rejectionReasons || [],
    idVerification: {
      status: p.idVerificationStatus,
      completed: !!p.idVerificationStatus,
      completedAt: p.idVerificationStatus ? p.updatedAt : null
    },
    selfieVerification: {
      status: p.selfieVerificationStatus,
      completed: !!p.selfieVerificationStatus,
      completedAt: p.selfieVerificationStatus ? p.updatedAt : null
    },
    manualReviewQueuedAt: p.manualReviewQueuedAt ?? null,
    manualReviewDeadlineAt: p.manualReviewDeadlineAt ?? null,
    manualReviewAssigneeLabel: p.manualReviewAssigneeLabel || '',
    manualReviewAssignedAt: p.manualReviewAssignedAt ?? null,
    manualReviewAuditTrail: Array.isArray(p.manualReviewAuditTrail) ? p.manualReviewAuditTrail : []
  };
}

function tallyErrorLike(obj, counts) {
  if (!obj || typeof obj !== 'object') return;
  const code = obj.textCode != null ? String(obj.textCode).trim() : '';
  const message = typeof obj.message === 'string' ? obj.message.slice(0, 120).trim() : '';
  const key = code || message || JSON.stringify(Object.keys(obj).sort());
  counts[key] = (counts[key] || 0) + 1;
}

function tallyFromStructuredArray(arr, counts) {
  if (!Array.isArray(arr)) return;
  for (const e of arr) {
    if (e != null && typeof e === 'object') tallyErrorLike(e, counts);
  }
}

/**
 * Get all verifications (admin endpoint)
 */
export const getVerifications = async (req, res) => {
  try {
    const ownerId = req.auth?.userId;
    if (!ownerId) {
      return res.status(401).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'UNAUTHORIZED', message: 'Unauthorized' }]
      });
    }

    const { page = 1, limit = 10, status } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitRaw = parseInt(String(limit), 10);
    const limitNum = Math.min(100, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 10));

    const skip = (pageNum - 1) * limitNum;

    const filter = { userId: ownerId };
    if (typeof status === 'string' && status.trim() && PROFILE_QUERY_STATUSES.has(status.trim().toUpperCase())) {
      filter.status = status.trim().toUpperCase();
    }

    const [profiles, total] = await Promise.all([
      Profile.find(filter).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      Profile.countDocuments(filter)
    ]);

    res.json({
      users: profiles.map(mapProfileDashboardRow),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalUsers: total,
        hasNext: skip + profiles.length < total,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Admin verifications error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/**
 * Get verification statistics
 */
export const getStats = async (req, res) => {
  try {
    const ownerId = req.auth?.userId;
    if (!ownerId) {
      return res.status(401).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'UNAUTHORIZED', message: 'Unauthorized' }]
      });
    }

    const base = { userId: ownerId };
    const [total, approved, rejected, pending, underReviewCount, activeApiKeys] = await Promise.all([
      Profile.countDocuments(base),
      Profile.countDocuments({ ...base, status: 'APPROVED' }),
      Profile.countDocuments({ ...base, status: 'REJECTED' }),
      Profile.countDocuments({ ...base, status: 'PENDING' }),
      Profile.countDocuments({ ...base, status: 'UNDER_REVIEW' }),
      ApiKey.countDocuments({ userId: ownerId, revokedAt: null })
    ]);

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    res.json({
      totalVerifications: total,
      approvedCount: approved,
      rejectedCount: rejected,
      pendingCount: pending,
      underReviewCount,
      approvalRate,
      activeApiKeysCount: activeApiKeys
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/** Paginated outbound webhook deliveries for the signed-in tenant. */
export const getWebhookDeliveries = async (req, res) => {
  try {
    const ownerId = req.auth?.userId;
    if (!ownerId) {
      return res.status(401).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'UNAUTHORIZED', message: 'Unauthorized' }]
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const failedOnly = req.query.failedOnly === '1' || req.query.failedOnly === 'true';
    const filter = failedOnly ? { userId: ownerId, succeeded: false } : { userId: ownerId };
    const [rows, total] = await Promise.all([
      WebhookDelivery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      WebhookDelivery.countDocuments(filter)
    ]);

    res.json({
      deliveries: rows.map((d) => ({
        id: d._id,
        event: d.event,
        deliveryId: d.deliveryId,
        profileId: d.profileId,
        httpStatus: d.httpStatus,
        attempts: d.attempts,
        succeeded: d.succeeded,
        errorMessage: d.errorMessage,
        errorClass: d.errorClass || '',
        responseSnippet: d.responseSnippet || '',
        createdAt: d.createdAt
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: skip + rows.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Admin webhook deliveries error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/** Deletes a verification profile and related Mongo artifacts for the signed-in tenant only. */
export const deleteOwnedVerification = async (req, res) => {
  try {
    const ownerId = req.auth?.userId;
    const { profileId } = req.params;
    if (!ownerId) {
      return res.status(401).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'UNAUTHORIZED', message: 'Unauthorized' }]
      });
    }
    if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'INVALID_PROFILE_ID', message: 'Invalid profile id' }]
      });
    }

    const profile = await Profile.findOne({ _id: profileId, userId: ownerId });
    if (!profile) {
      return res.status(404).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'NOT_FOUND', message: 'Profile not found' }]
      });
    }

    const pid = new mongoose.Types.ObjectId(profileId);
    const [idLatest, selfieLatest] = await Promise.all([
      IdCardValidation.findOne({ profileId: pid }).sort({ createdAt: -1 }).lean(),
      SelfieValidation.findOne({ profileId: pid }).sort({ createdAt: -1 }).lean()
    ]);
    const extraUrls = [];
    if (idLatest?.frontImageUrl) extraUrls.push(idLatest.frontImageUrl);
    if (idLatest?.backImageUrl) extraUrls.push(idLatest.backImageUrl);
    if (selfieLatest?.idPhotoUrl) extraUrls.push(selfieLatest.idPhotoUrl);
    if (Array.isArray(selfieLatest?.selfieUrls)) extraUrls.push(...selfieLatest.selfieUrls);

    const purgeSummary = await purgeVerificationStorageForProfile(profile, extraUrls);

    await Promise.all([
      IdCardValidation.deleteMany({ profileId: pid }),
      SelfieValidation.deleteMany({ profileId: pid }),
      WebhookDelivery.deleteMany({ profileId: pid })
    ]);
    await Profile.deleteOne({ _id: pid });

    res.json({ success: true, objectPurge: purgeSummary });
  } catch (error) {
    console.error('Admin delete verification error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

export const replayTerminalWebhook = async (req, res) => {
  try {
    const ownerId = req.auth?.userId;
    const { profileId } = req.params;
    if (!ownerId) {
      return res.status(401).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'UNAUTHORIZED', message: 'Unauthorized' }]
      });
    }
    if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'INVALID_PROFILE_ID', message: 'Invalid profile id' }]
      });
    }

    const profile = await Profile.findOne({ _id: profileId, userId: ownerId });
    if (!profile) {
      return res.status(404).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'NOT_FOUND', message: 'Profile not found' }]
      });
    }

    const st = String(profile.status ?? '').toUpperCase();
    if (!['APPROVED', 'REJECTED', 'FAILED'].includes(st)) {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [
          {
            textCode: 'NOT_TERMINAL',
            message: 'Webhook replay is only available for APPROVED, REJECTED, or FAILED profiles.'
          }
        ]
      });
    }

    const useStoredDelivery =
      req.query.useStoredDelivery === '1' || req.query.useStoredDelivery === 'true';
    if (useStoredDelivery) {
      const event = st === 'APPROVED' ? 'verification.completed' : 'verification.failed';
      const last = await WebhookDelivery.findOne({
        userId: ownerId,
        profileId: profile._id,
        event,
        payload: { $type: 'object' }
      })
        .sort({ createdAt: -1 })
        .select('payload');

      if (last?.payload && typeof last.payload === 'object') {
        emitVerificationTerminalWebhook({
          tenantUserId: ownerId,
          profile,
          correlationId: req.correlationId,
          forceEventType: event,
          forcePayload: last.payload,
          replaySource: 'stored',
          bypassSubscriptionCheck: true
        });
        return res.json({ success: true, replaySource: 'stored' });
      }
    }
    emitVerificationTerminalWebhook({
      tenantUserId: ownerId,
      profile,
      correlationId: req.correlationId,
      replaySource: 'live',
      bypassSubscriptionCheck: true
    });
    res.json({ success: true, replaySource: 'live' });
  } catch (error) {
    console.error('Admin replay webhook error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

export const listManualReviewQueue = async (req, res) => {
  try {
    const ownerId = req.auth?.userId;
    if (!ownerId) {
      return res.status(401).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'UNAUTHORIZED', message: 'Unauthorized' }]
      });
    }

    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const lim = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (pageNum - 1) * lim;
    const filter = { userId: ownerId, status: 'UNDER_REVIEW' };

    const [profiles, total] = await Promise.all([
      Profile.find(filter).skip(skip).limit(lim).sort({ updatedAt: -1 }),
      Profile.countDocuments(filter)
    ]);

    res.json({
      users: profiles.map(mapProfileDashboardRow),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / lim) || 1,
        totalUsers: total,
        hasNext: skip + profiles.length < total,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Admin manual-review list error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

export const enqueueManualReview = async (req, res) => {
  try {
    const ownerId = req.auth?.userId;
    const { profileId } = req.params;
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    if (!ownerId) {
      return res.status(401).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'UNAUTHORIZED', message: 'Unauthorized' }]
      });
    }
    if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'INVALID_PROFILE_ID', message: 'Invalid profile id' }]
      });
    }

    const profile = await Profile.findOne({ _id: profileId, userId: ownerId });
    if (!profile) {
      return res.status(404).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'NOT_FOUND', message: 'Profile not found' }]
      });
    }

    const cur = String(profile.status ?? '').toUpperCase();
    if (cur !== 'PENDING') {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [
          {
            textCode: 'INVALID_STATE',
            message: 'Only PENDING profiles can be escalated to manual review.'
          }
        ]
      });
    }

    const slaRaw = Number(process.env.MANUAL_REVIEW_SLA_HOURS || 72);
    const slaHours = Number.isFinite(slaRaw) && slaRaw > 0 ? Math.min(slaRaw, 24 * 30) : 72;
    const deadline = new Date(Date.now() + slaHours * 3600 * 1000);

    let assignee = '';
    if (typeof body.assigneeLabel === 'string') {
      assignee = body.assigneeLabel.trim().slice(0, 160);
    }

    profile.status = 'UNDER_REVIEW';
    profile.manualReviewQueuedAt = new Date();
    profile.manualReviewDeadlineAt = deadline;
    profile.manualReviewAssigneeLabel = assignee;
    profile.manualReviewAssignedAt = new Date();
    profile.manualReviewAuditTrail = Array.isArray(profile.manualReviewAuditTrail)
      ? profile.manualReviewAuditTrail
      : [];
    profile.manualReviewAuditTrail.push({
      action: 'QUEUED',
      at: new Date(),
      actorUserId: ownerId,
      assigneeLabel: assignee,
      note: ''
    });
    await profile.save();
    emitManualReviewQueuedWebhook({
      tenantUserId: ownerId,
      profile,
      correlationId: req.correlationId
    });
    res.json({
      success: true,
      profileId: String(profile._id),
      status: profile.status,
      manualReviewDeadlineAt: deadline.toISOString()
    });
  } catch (error) {
    console.error('Admin enqueue manual review error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

export const resolveManualReview = async (req, res) => {
  try {
    const ownerId = req.auth?.userId;
    const { profileId } = req.params;
    const { decision, note } = req.body || {};

    if (!ownerId) {
      return res.status(401).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'UNAUTHORIZED', message: 'Unauthorized' }]
      });
    }
    if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'INVALID_PROFILE_ID', message: 'Invalid profile id' }]
      });
    }

    const d = String(decision ?? '').toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(d)) {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'INVALID_DECISION', message: 'decision must be APPROVED or REJECTED' }]
      });
    }

    const profile = await Profile.findOne({ _id: profileId, userId: ownerId });
    if (!profile) {
      return res.status(404).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'NOT_FOUND', message: 'Profile not found' }]
      });
    }

    if (String(profile.status ?? '').toUpperCase() !== 'UNDER_REVIEW') {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'INVALID_STATE', message: 'Profile is not in UNDER_REVIEW state.' }]
      });
    }

    profile.manualReviewQueuedAt = null;
    profile.manualReviewDeadlineAt = null;
    profile.manualReviewAssigneeLabel = '';
    profile.manualReviewAssignedAt = null;
    profile.manualReviewAuditTrail = Array.isArray(profile.manualReviewAuditTrail)
      ? profile.manualReviewAuditTrail
      : [];
    profile.manualReviewAuditTrail.push({
      action: d === 'APPROVED' ? 'RESOLVED_APPROVED' : 'RESOLVED_REJECTED',
      at: new Date(),
      actorUserId: ownerId,
      assigneeLabel: '',
      note: typeof note === 'string' ? note.trim().slice(0, 300) : ''
    });

    if (d === 'APPROVED') {
      profile.status = 'APPROVED';
      profile.rejectionReasons = [];
    } else {
      profile.status = 'REJECTED';
      const trimmed = typeof note === 'string' ? note.trim() : '';
      profile.rejectionReasons = trimmed
        ? [
            {
              code: 'MANUAL_REJECT',
              message: trimmed,
              severity: 'critical',
              textCode: 'MANUAL_REJECT'
            }
          ]
        : [
            {
              code: 'MANUAL_REJECT',
              message: 'Rejected after manual review.',
              severity: 'critical',
              textCode: 'MANUAL_REJECT'
            }
          ];
    }
    await profile.save();
    await incrementUserVerificationUsage(ownerId);
    emitManualReviewResolvedWebhook({
      tenantUserId: ownerId,
      profile,
      decision: d,
      correlationId: req.correlationId
    });
    emitVerificationTerminalWebhook({
      tenantUserId: ownerId,
      profile,
      correlationId: req.correlationId
    });
    res.json({ success: true, profileId: String(profile._id), status: profile.status });
  } catch (error) {
    console.error('Admin resolve manual review error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

export const mintVerificationCaptureSessionHandler = async (req, res) => {
  try {
    const ownerId = req.auth?.userId;
    const { profileId } = req.params;
    const body = typeof req.body === 'object' && req.body ? req.body : {};

    if (!ownerId) {
      return res.status(401).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'UNAUTHORIZED', message: 'Unauthorized' }]
      });
    }
    if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'INVALID_PROFILE_ID', message: 'Invalid profile id' }]
      });
    }

    const secret = String(process.env.VERIFICATION_CAPTURE_TOKEN_SECRET ?? '').trim();
    if (!secret || secret.length < 16) {
      return res.status(503).json({
        status: STATUS.FAILED,
        errors: [
          {
            textCode: 'CAPTURE_SESSION_DISABLED',
            message: 'Configure VERIFICATION_CAPTURE_TOKEN_SECRET before minting tokens.'
          }
        ]
      });
    }

    const profile = await Profile.findOne({ _id: profileId, userId: ownerId });
    if (!profile) {
      return res.status(404).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'NOT_FOUND', message: 'Profile not found' }]
      });
    }

    const ttlParsed = Number(body.ttlSeconds);
    const ttl = Number.isFinite(ttlParsed) && ttlParsed > 0 ? ttlParsed : undefined;
    const issued = mintCaptureSessionToken({
      secret,
      tenantUserId: ownerId,
      profileId: String(profile._id),
      ttlSeconds: ttl
    });
    if (!issued) {
      return res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
    }

    res.json({
      success: true,
      token: issued.token,
      expiresAtEpochSec: issued.expiresAtEpochSec,
      headerName: 'X-Verification-Session'
    });
  } catch (error) {
    console.error('Mint capture session error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/** Recent structured error fingerprints for owned profiles — admin debugging. */
export const getKeyedErrorSummary = async (req, res) => {
  try {
    const ownerId = req.auth?.userId;
    if (!ownerId) {
      return res.status(401).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'UNAUTHORIZED', message: 'Unauthorized' }]
      });
    }

    const limitDocs = Math.min(400, Number(req.query.limit) || 250);
    const profileIds = await Profile.find({ userId: ownerId }).distinct('_id');

    const [idVals, selfieVals] = await Promise.all([
      IdCardValidation.find({ profileId: { $in: profileIds } })
        .sort({ createdAt: -1 })
        .limit(limitDocs)
        .select('errors rejectionReasons')
        .lean(),
      SelfieValidation.find({ profileId: { $in: profileIds } })
        .sort({ createdAt: -1 })
        .limit(limitDocs)
        .select('errors rejectionReasons')
        .lean()
    ]);

    const counts = {};
    for (const row of idVals) {
      tallyFromStructuredArray(row.errors, counts);
      tallyFromStructuredArray(row.rejectionReasons, counts);
    }
    for (const row of selfieVals) {
      tallyFromStructuredArray(row.errors, counts);
      tallyFromStructuredArray(row.rejectionReasons, counts);
    }

    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([key, cnt]) => ({ key, count: cnt }));

    res.json({
      totals: Object.keys(counts).length,
      sampleSize: Math.max(idVals.length, selfieVals.length),
      top
    });
  } catch (error) {
    console.error('Keyed error summary error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/**
 * Get current settings (uses KycConfiguration)
 */
export const getSettings = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    let config = await KycConfiguration.findOne({ userId, environment: 'production' }).select(
      '+integrationWebhookSecret'
    );

    if (!config) {
      const defaultConfig = createDefaultConfig(userId);
      config = await KycConfiguration.create(defaultConfig);
      config = await KycConfiguration.findById(config._id).select('+integrationWebhookSecret');
    }

    res.json({
      settings: buildPublicSettingsFromConfig(config),
      defaults: PRESETS.balanced
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/**
 * Update settings
 */
export const updateSettings = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const { verificationRules, thresholds } = body;

    const integrationPatch =
      body.integrationWebhookUrl !== undefined || body.integrationWebhookSecret !== undefined
        ? { webhookUrl: body.integrationWebhookUrl, webhookSecret: body.integrationWebhookSecret }
        : body.integration != null && typeof body.integration === 'object'
          ? body.integration
          : null;

    const config = await KycConfiguration.findOne({ userId, environment: 'production' });
    if (!config) {
      return res.status(404).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'NOT_FOUND', message: 'Configuration not found' }]
      });
    }

    let integrationTouched = false;

    const applyIntegrationPatch = (integ) => {
      if (!integ || typeof integ !== 'object') return;
      if (integ.webhookUrl !== undefined) {
        integrationTouched = true;
        const raw = typeof integ.webhookUrl === 'string' ? integ.webhookUrl.trim() : '';
        if (raw.length > MAX_INTEGRATION_WEBHOOK_URL) {
          throw Object.assign(new Error('Webhook URL is too long'), { statusCode: 400 });
        }
        config.integrationWebhookUrl = raw === '' ? null : raw;
      }
      if (integ.webhookSecret !== undefined) {
        integrationTouched = true;
        const raw =
          typeof integ.webhookSecret === 'string'
            ? integ.webhookSecret.trim()
            : integ.webhookSecret;
        if (raw === '' || raw == null) {
          config.integrationWebhookSecret = null;
        } else {
          const s = String(raw).trim().slice(0, MAX_INTEGRATION_WEBHOOK_SECRET);
          config.integrationWebhookSecret = s.length ? s : null;
        }
      }
      if (integ.webhookEvents !== undefined) {
        integrationTouched = true;
        if (!Array.isArray(integ.webhookEvents)) {
          throw Object.assign(new Error('webhookEvents must be an array'), { statusCode: 400 });
        }
        config.integrationWebhookEvents =
          normalizeOutboundWebhookSubscriptions(integ.webhookEvents);
      }
    };

    applyIntegrationPatch(integrationPatch);

    try {
      if (verificationRules) {
        Object.assign(config.verificationSteps, verificationRules);
      }

      if (thresholds) {
        applyFlatThresholdPatches(config, thresholds);
      }
    } catch (err) {
      if (err?.statusCode === 400) throw err;
      throw err;
    }

    if (verificationRules || thresholds || integrationTouched) {
      config.version += 1;
    }

    await config.save();

    const refreshed = await KycConfiguration.findById(config._id).select('+integrationWebhookSecret');
    res.json({
      success: true,
      settings: buildPublicSettingsFromConfig(refreshed),
      message: 'Settings updated successfully'
    });
  } catch (error) {
    if (error?.statusCode === 400) {
      return res.status(400).json({
        status: STATUS.FAILED,
        errors: [{ textCode: 'INVALID_INPUT', message: error.message || 'Bad request' }]
      });
    }
    console.error('Update settings error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

/**
 * Reset settings to defaults
 */
export const resetSettings = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const defaultConfig = createDefaultConfig(userId);

    const config = await KycConfiguration.findOneAndUpdate(
      { userId, environment: 'production' },
      defaultConfig,
      { upsert: true, new: true }
    );

    const refreshed = await KycConfiguration.findById(config._id).select('+integrationWebhookSecret');
    res.json({
      success: true,
      settings: buildPublicSettingsFromConfig(refreshed),
      message: 'Settings reset to defaults'
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ status: STATUS.FAILED, errors: [ERRORS.INTERNAL_ERROR] });
  }
};

// ============================================================================
// HELPERS
// ============================================================================
