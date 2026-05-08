/**
 * Example JSON bodies for developer docs on Integrations (language-neutral wire format).
 * Keep field names aligned with backend/services/verificationWebhook.js — `id` is added at delivery time.
 */

export const TERMINAL_WEBHOOK_BODY_EXAMPLE = `{
  "type": "verification.completed",
  "created": "2026-05-08T12:00:00.000Z",
  "apiVersion": "2026-05-06",
  "data": {
    "profileId": "656af2e3f91b2f001234abcd",
    "sessionId": "656af2e3f91b2f001234abcd",
    "status": "APPROVED",
    "correlationId": null,
    "outcomeSemantics": "FINAL"
  }
}`;

export const MANUAL_REVIEW_RESOLVED_BODY_EXAMPLE = `{
  "type": "verification.manual_review_resolved",
  "created": "2026-05-08T12:00:00.000Z",
  "apiVersion": "2026-05-06",
  "data": {
    "profileId": "656af2e3f91b2f001234abcd",
    "sessionId": "656af2e3f91b2f001234abcd",
    "status": "APPROVED",
    "decision": "APPROVED",
    "correlationId": null
  }
}`;
