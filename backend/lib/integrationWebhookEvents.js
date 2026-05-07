/** Outbound webhook event types configurable per tenant integration. Order is stable UI/API order. */
export const OUTBOUND_WEBHOOK_EVENT_TYPES = Object.freeze([
  'verification.manual_review_queued',
  'verification.completed',
  'verification.failed'
]);

const SET = new Set(OUTBOUND_WEBHOOK_EVENT_TYPES);

export function allOutboundWebhookEventTypes() {
  return [...OUTBOUND_WEBHOOK_EVENT_TYPES];
}

/**
 * Canonical subscription list from client input or DB document.
 */
export function normalizeOutboundWebhookSubscriptions(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const t of OUTBOUND_WEBHOOK_EVENT_TYPES) {
    if (raw.some((x) => typeof x === 'string' && x.trim() === t)) out.push(t);
  }
  return out;
}

/**
 * For GET `/admin/settings` — omit / non-array on disk means legacy “subscribe to all”.
 */
export function resolveOutboundWebhookSubscriptionsForPublic(integrationWebhookEvents) {
  if (!Array.isArray(integrationWebhookEvents)) {
    return allOutboundWebhookEventTypes();
  }
  return normalizeOutboundWebhookSubscriptions(integrationWebhookEvents);
}

/**
 * @param {object} cfg - KycConfiguration with optional integrationWebhookEvents
 * @param {string} eventType
 */
export function outboundWebhookAllowsEvent(cfg, eventType, opts = {}) {
  if (!SET.has(eventType)) return false;
  if (opts.bypassSubscription) return true;

  const raw = cfg?.integrationWebhookEvents;
  if (!Array.isArray(raw)) {
    return true;
  }
  const normalized = normalizeOutboundWebhookSubscriptions(raw);
  if (normalized.length === 0) {
    return false;
  }
  return normalized.includes(eventType);
}
