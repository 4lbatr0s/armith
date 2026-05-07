/**
 * Outbound tenant webhooks: event matrix and non-triggers — see repo `docs/OUTBOUND_WEBHOOK_EVENTS.md`.
 */
import { createHmac, randomUUID } from 'crypto';

import logger from '../lib/logger.js';
import { outboundWebhookAllowsEvent } from '../lib/integrationWebhookEvents.js';
import { KycConfiguration, WebhookDelivery } from '../models/index.js';
import { deriveOutcomeSemantics } from './kyc/webhookOutcomeSemantics.js';

const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 500, 2000];

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fire-and-forget HMAC-signed webhook when a profile reaches APPROVED | REJECTED | FAILED.
 */
export function emitVerificationTerminalWebhook({
  tenantUserId,
  profile,
  correlationId,
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

            const eventType = st === 'APPROVED' ? 'verification.completed' : 'verification.failed';
            if (
                !outboundWebhookAllowsEvent(cfg, eventType, {
                    bypassSubscription: bypassSubscriptionCheck
                })
            ) {
                return;
            }
            const deliveryId = randomUUID();
            const payload = {
                id: deliveryId,
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
            const raw = JSON.stringify(payload);

            let lastStatus;
            let lastErr;
            for (let i = 0; i < MAX_ATTEMPTS; i++) {
                if (BACKOFF_MS[i]) await sleep(BACKOFF_MS[i]);
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
                            profileId: profile._id,
                            event: eventType,
                            deliveryId,
                            httpStatus: lastStatus,
                            attempts: i + 1,
                            succeeded: true
                        });
                        return;
                    }
                    lastErr = `HTTP ${httpRes.status}`;
                } catch (e) {
                    lastErr = e?.message ?? String(e);
                }
            }

            await WebhookDelivery.create({
                userId: tenantUserId,
                profileId: profile._id,
                event: eventType,
                deliveryId,
                httpStatus: lastStatus,
                errorMessage: lastErr ?? 'delivery_failed',
                attempts: MAX_ATTEMPTS,
                succeeded: false
            });
            logger.warn(
                { profileId: String(profile._id), eventType, deliveryId, httpStatus: lastStatus },
                'Webhook delivery failed after retries'
            );
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

            const deliveryId = randomUUID();
            const payload = {
                id: deliveryId,
                type: 'verification.manual_review_queued',
                created: new Date().toISOString(),
                apiVersion: '2026-05-06',
                data: {
                    profileId: String(profile._id),
                    sessionId: String(profile._id),
                    status: String(profile.status ?? '').toUpperCase(),
                    correlationId: correlationId ?? null
                }
            };
            const raw = JSON.stringify(payload);

            let lastStatus;
            let lastErr;
            for (let i = 0; i < MAX_ATTEMPTS; i++) {
                if (BACKOFF_MS[i]) await sleep(BACKOFF_MS[i]);
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
                            profileId: profile._id,
                            event: payload.type,
                            deliveryId,
                            httpStatus: lastStatus,
                            attempts: i + 1,
                            succeeded: true
                        });
                        return;
                    }
                    lastErr = `HTTP ${httpRes.status}`;
                } catch (e) {
                    lastErr = e?.message ?? String(e);
                }
            }

            await WebhookDelivery.create({
                userId: tenantUserId,
                profileId: profile._id,
                event: payload.type,
                deliveryId,
                httpStatus: lastStatus,
                errorMessage: lastErr ?? 'delivery_failed',
                attempts: MAX_ATTEMPTS,
                succeeded: false
            });
            logger.warn(
                { profileId: String(profile._id), deliveryId, httpStatus: lastStatus },
                'Manual-review webhook delivery failed after retries'
            );
        } catch (e) {
            logger.warn({ err: e }, 'emitManualReviewQueuedWebhook crashed');
        }
    })();
}
