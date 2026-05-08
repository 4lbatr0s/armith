/**
 * Outbound tenant webhooks: event matrix and non-triggers — see repo `docs/OUTBOUND_WEBHOOK_EVENTS.md`.
 */
import { createHmac, randomUUID } from 'crypto';

import logger from '../lib/logger.js';
import { outboundWebhookAllowsEvent } from '../lib/integrationWebhookEvents.js';
import {
  buildWebhookOptionalData,
  mergeWebhookDataSection,
  normalizeIntegrationWebhookDataFields
} from '../lib/webhookPayloadExtras.js';
import { KycConfiguration, WebhookDelivery } from '../models/index.js';
import { deriveOutcomeSemantics } from './kyc/webhookOutcomeSemantics.js';

function readPositiveInt(raw, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return Math.min(Math.floor(parsed), max);
}

const TIMEOUT_MS = readPositiveInt(process.env.WEBHOOK_DELIVERY_TIMEOUT_MS, 8000, 100, 120000);
const MAX_ATTEMPTS = readPositiveInt(process.env.WEBHOOK_DELIVERY_MAX_ATTEMPTS, 3, 1, 10);
const BACKOFF_MS = [
  0,
  readPositiveInt(process.env.WEBHOOK_DELIVERY_BACKOFF_MS_2, 500, 0, 60000),
  readPositiveInt(process.env.WEBHOOK_DELIVERY_BACKOFF_MS_3, 2000, 0, 60000)
];

function backoffDelayForAttempt(attemptIndex) {
  const configured = BACKOFF_MS[attemptIndex];
  if (Number.isFinite(configured)) return configured;
  const fallback = BACKOFF_MS[BACKOFF_MS.length - 1] ?? 0;
  return Number.isFinite(fallback) ? fallback : 0;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function enrichWebhookPayloadData(profile, cfg, payload) {
  if (!payload || typeof payload !== 'object' || typeof payload.data !== 'object' || payload.data === null) {
    return payload;
  }
  const normalized = normalizeIntegrationWebhookDataFields(cfg?.integrationWebhookDataFields);
  const extras = buildWebhookOptionalData(profile, normalized);
  return {
    ...payload,
    data: mergeWebhookDataSection(payload.data, extras)
  };
}

async function deliverWebhook({
  tenantUserId,
  profileId,
  eventType,
  payload,
  url,
  secret,
  replaySource = 'live',
  warnMessage = 'Webhook delivery failed after retries'
}) {
  const deliveryId = randomUUID();
  const payloadWithId = {
    ...(payload || {}),
    id: deliveryId
  };
  const raw = JSON.stringify(payloadWithId);

  let lastStatus;
  let lastErr;
  let lastErrorClass;
  let lastResponseSnippet;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const waitMs = backoffDelayForAttempt(i);
    if (waitMs > 0) await sleep(waitMs);
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');

    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      let httpRes;
      try {
        httpRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Timestamp': ts,
            'X-Webhook-Signature': `sha256=${sig}`
          },
          body: raw,
          signal: ctrl.signal
        });
      } finally {
        clearTimeout(tid);
      }
      lastStatus = httpRes.status;
      if (httpRes.ok) {
        await WebhookDelivery.create({
          userId: tenantUserId,
          profileId,
          event: eventType,
          deliveryId,
          payload: payloadWithId,
          replaySource,
          httpStatus: lastStatus,
          attempts: i + 1,
          succeeded: true
        });
        return;
      }
      lastErrorClass = 'HTTP_ERROR';
      const bodyText = await httpRes.text().catch(() => '');
      lastResponseSnippet = typeof bodyText === 'string' ? bodyText.slice(0, 300) : '';
      lastErr = `HTTP ${httpRes.status}`;
    } catch (e) {
      lastErrorClass = e?.name ? String(e.name) : 'NETWORK_ERROR';
      lastErr = e?.message ?? String(e);
    }
  }

  await WebhookDelivery.create({
    userId: tenantUserId,
    profileId,
    event: eventType,
    deliveryId,
    payload: payloadWithId,
    replaySource,
    httpStatus: lastStatus,
    errorMessage: lastErr ?? 'delivery_failed',
    errorClass: lastErrorClass ?? 'DELIVERY_FAILED',
    responseSnippet: lastResponseSnippet ?? '',
    attempts: MAX_ATTEMPTS,
    succeeded: false
  });
  logger.warn(
    { profileId: String(profileId), eventType, deliveryId, httpStatus: lastStatus },
    warnMessage
  );
}

/**
 * Fire-and-forget HMAC-signed webhook when a profile reaches APPROVED | REJECTED | FAILED.
 */
export function emitVerificationTerminalWebhook({
  tenantUserId,
  profile,
  correlationId = null,
  forceEventType = null,
  forcePayload = null,
  replaySource = 'live',
  bypassSubscriptionCheck = false
}) {
    if (!tenantUserId || !profile) return;

    const st = String(profile.status ?? '').toUpperCase();
    if (!['APPROVED', 'REJECTED', 'FAILED'].includes(st)) return;

    void (async () => {
        try {
            const cfg = await KycConfiguration.findOne({
                userId: tenantUserId,
                environment: 'production'
            }).select('+integrationWebhookSecret integrationWebhookUrl integrationWebhookEvents');

            const url = cfg?.integrationWebhookUrl?.trim();
            const secret = cfg?.integrationWebhookSecret;
            if (!url || !secret) return;

            const eventType =
              typeof forceEventType === 'string' && forceEventType.trim()
                ? forceEventType.trim()
                : st === 'APPROVED'
                  ? 'verification.completed'
                  : 'verification.failed';
            if (
                !outboundWebhookAllowsEvent(cfg, eventType, {
                    bypassSubscription: bypassSubscriptionCheck
                })
            ) {
                return;
            }
            const basePayload =
              forcePayload && typeof forcePayload === 'object'
                ? forcePayload
                : {
                    type: eventType,
                    created: new Date().toISOString(),
                    apiVersion: '2026-05-06',
                    data: {
                      profileId: String(profile._id),
                      sessionId: String(profile._id),
                      status: st,
                      correlationId: correlationId ?? null,
                      outcomeSemantics: deriveOutcomeSemantics(profile)
                    }
                  };
            const payload =
              forcePayload && typeof forcePayload === 'object'
                ? basePayload
                : enrichWebhookPayloadData(profile, cfg, basePayload);

            await deliverWebhook({
              tenantUserId,
              profileId: profile._id,
              eventType,
              payload,
              url,
              secret,
              replaySource,
              warnMessage: 'Webhook delivery failed after retries'
            });
        } catch (e) {
            logger.warn({ err: e }, 'emitVerificationTerminalWebhook crashed');
        }
    })();
}

/** Non-terminal: human queue (logged like terminal deliveries). */
export function emitManualReviewQueuedWebhook({ tenantUserId, profile, correlationId }) {
    if (!tenantUserId || !profile) return;
    const pst = String(profile.status ?? '').toUpperCase();
    if (pst !== 'UNDER_REVIEW') return;

    void (async () => {
        try {
            const cfg = await KycConfiguration.findOne({
                userId: tenantUserId,
                environment: 'production'
            }).select('+integrationWebhookSecret integrationWebhookUrl integrationWebhookEvents');

            const url = cfg?.integrationWebhookUrl?.trim();
            const secret = cfg?.integrationWebhookSecret;
            if (!url || !secret) return;

            if (!outboundWebhookAllowsEvent(cfg, 'verification.manual_review_queued')) {
                return;
            }

            const payload = enrichWebhookPayloadData(profile, cfg, {
              type: 'verification.manual_review_queued',
              created: new Date().toISOString(),
              apiVersion: '2026-05-06',
              data: {
                profileId: String(profile._id),
                sessionId: String(profile._id),
                status: String(profile.status ?? '').toUpperCase(),
                correlationId: correlationId ?? null
              }
            });
            await deliverWebhook({
              tenantUserId,
              profileId: profile._id,
              eventType: payload.type,
              payload,
              url,
              secret,
              warnMessage: 'Manual-review webhook delivery failed after retries'
            });
        } catch (e) {
            logger.warn({ err: e }, 'emitManualReviewQueuedWebhook crashed');
        }
    })();
}

/** Non-terminal: manual review resolved event after admin decision is persisted. */
export function emitManualReviewResolvedWebhook({
  tenantUserId,
  profile,
  decision,
  correlationId
}) {
  if (!tenantUserId || !profile) return;
  const resolved = String(decision ?? '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(resolved)) return;

  void (async () => {
    try {
      const cfg = await KycConfiguration.findOne({
        userId: tenantUserId,
        environment: 'production'
      }).select('+integrationWebhookSecret integrationWebhookUrl integrationWebhookEvents');

      const url = cfg?.integrationWebhookUrl?.trim();
      const secret = cfg?.integrationWebhookSecret;
      if (!url || !secret) return;
      const eventType = 'verification.manual_review_resolved';
      if (!outboundWebhookAllowsEvent(cfg, eventType)) return;

      const payload = enrichWebhookPayloadData(profile, cfg, {
        type: eventType,
        created: new Date().toISOString(),
        apiVersion: '2026-05-06',
        data: {
          profileId: String(profile._id),
          sessionId: String(profile._id),
          status: String(profile.status ?? '').toUpperCase(),
          decision: resolved,
          correlationId: correlationId ?? null
        }
      });
      await deliverWebhook({
        tenantUserId,
        profileId: profile._id,
        eventType,
        payload,
        url,
        secret,
        warnMessage: 'Manual-review resolved webhook delivery failed after retries'
      });
    } catch (e) {
      logger.warn({ err: e }, 'emitManualReviewResolvedWebhook crashed');
    }
  })();
}
