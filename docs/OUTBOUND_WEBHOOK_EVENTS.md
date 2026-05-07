# Outbound integration webhooks — when they fire

Armith POSTs **HMAC-signed JSON** to your configured HTTPS URL. Delivery is **not** tied to every REST response; it runs **after the profile is persisted** in MongoDB and only for the transitions below.

## Event types (`payload.type`)

| `type` | Emitted when |
|--------|----------------|
| `verification.manual_review_queued` | A tenant admin **queues** a session for manual review: profile status becomes **`UNDER_REVIEW`** (from **`PENDING`**) via `POST /admin/manual-reviews/:profileId/enqueue`. |
| `verification.completed` | Profile status is saved as **`APPROVED`** (terminal). Typical paths: successful **`POST /kyc/selfie-check`** when rules require both ID + selfie; **`POST /kyc/id-check`** when tenant rules make the session **terminal** as approved without selfie; or **`POST /admin/manual-reviews/:profileId/resolve`** with `decision: APPROVED`. |
| `verification.failed` | Profile status is saved as **`REJECTED`** or **`FAILED`** (terminal). Same API surfaces as above when the pipeline or admin decision lands in those statuses. |

Implementation reference: `backend/services/verificationWebhook.js` (`emitManualReviewQueuedWebhook`, `emitVerificationTerminalWebhook`).

## Event subscriptions

In the dashboard (**Integrations**), each tenant configures which `type` values this outbound endpoint receives; stored as `integrationWebhookEvents` on `KycConfiguration`. When the field is **omitted** (legacy documents), Armith behaves as **subscribed to all** types above. A persisted **empty array** disables automatic POSTs (URL + secret can still be saved). **`POST /admin/webhooks/replay/:profileId`** resends terminal payloads regardless of subscription so operators can recover a missed delivery.

## What does **not** trigger a webhook

- **Intermediate / non-terminal** profile rows, e.g. **`PENDING`** while the user still owes a selfie after a successful ID step (no terminal status yet).
- **`UNDER_REVIEW`** itself does not produce `verification.completed` / `verification.failed` until an admin **resolves** the queue (or you move the profile to a terminal state through the normal verification APIs).
- Missing configuration: if **URL** or **signing secret** is unset, nothing is sent (same module returns early).

## Admin replay

`POST /admin/webhooks/replay/:profileId` re-sends the **terminal** payload (`verification.completed` or `verification.failed`) for profiles already in **`APPROVED`**, **`REJECTED`**, or **`FAILED`**. It does not change state.

## Payload shape (summary)

- Headers: `X-Webhook-Timestamp`, `X-Webhook-Signature` (`sha256=<hex>` over `timestamp + '.' + rawBody`).
- Body: `id`, `type`, `created`, `apiVersion`, `data` with `profileId`, `sessionId`, `status`, optional `correlationId`, and for terminal events `outcomeSemantics` when applicable (`deriveOutcomeSemantics` in `backend/services/kyc/webhookOutcomeSemantics.js`).

For full REST details, keep the canonical API doc in sync with this file when the product surface changes.
