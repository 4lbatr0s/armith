# Outbound webhook events

Tenant-configurable event types are defined in code: `backend/lib/integrationWebhookEvents.js` (`OUTBOUND_WEBHOOK_EVENT_TYPES`).

| Event | Typical trigger |
|-------|------------------|
| `verification.completed` | Profile reaches a successful terminal path (e.g. approved). |
| `verification.failed` | Profile reaches a failed terminal outcome. |
| `verification.manual_review_queued` | Profile escalated to manual review. |
| `verification.manual_review_resolved` | Manual review queue cleared with a resolution. |

Delivery is synchronous HTTP **POST** with JSON body from [`backend/services/verificationWebhook.js`](../backend/services/verificationWebhook.js).

## HTTP headers (verification)

| Header | Meaning |
|--------|---------|
| `Content-Type` | `application/json` |
| `X-Webhook-Timestamp` | Unix seconds (string) at send time |
| `X-Webhook-Signature` | `sha256=<hex>` HMAC-SHA256 of `"{timestamp}.{rawBody}"` using the tenant’s webhook signing secret |

The raw body is the JSON string **after** the server adds a top-level `id` (delivery UUID) to the payload. Verify using the exact received bytes.

## Base JSON shape (all events)

Every delivery includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique delivery id (added immediately before send). |
| `type` | string | Event name (same as webhook event type below). |
| `created` | string (ISO-8601) | Time payload was assembled. |
| `apiVersion` | string | Current contract version (`2026-05-06`). |
| `data` | object | Event-specific payload (see below). Optional extra keys below. |

Terminal outcomes (`verification.completed` / `verification.failed`) additionally include `data.outcomeSemantics` when applicable (`FINAL` or `RETRY_SUGGESTED`); see [`backend/services/kyc/webhookOutcomeSemantics.js`](../backend/services/kyc/webhookOutcomeSemantics.js).

## `data` objects by event type

### `verification.completed` / `verification.failed`

Minimal `data` (always present):

| Field | Type | Description |
|-------|------|-------------|
| `profileId` | string | MongoDB ObjectId of the verification profile |
| `sessionId` | string | Same as `profileId` (legacy compatibility) |
| `status` | string | Uppercase profile status (`APPROVED`, `REJECTED`, `FAILED`) |
| `correlationId` | string or null | Request correlation id when available |
| `outcomeSemantics` | string | `FINAL` or `RETRY_SUGGESTED` (terminal webhooks only) |

### `verification.manual_review_queued`

| Field | Type | Description |
|-------|------|-------------|
| `profileId`, `sessionId` | string | As above |
| `status` | string | Typically `UNDER_REVIEW` |
| `correlationId` | string or null | |

### `verification.manual_review_resolved`

| Field | Type | Description |
|-------|------|-------------|
| `profileId`, `sessionId`, `status` | string | As above (`status` after resolution) |
| `decision` | string | `APPROVED` or `REJECTED` (resolution outcome) |
| `correlationId` | string or null | |

## Optional fields in `data` (tenant allowlist)

Per tenant, extra keys may be appended to **`data`** when enabled in Dashboard → Integrations (stored as `integrationWebhookDataFields` on `KycConfiguration`). Allowed tokens are listed in [`backend/lib/webhookPayloadExtras.js`](../backend/lib/webhookPayloadExtras.js) (`WEBHOOK_OPTIONAL_DATA_FIELDS`).

| Token | Meaning |
|-------|---------|
| `country` | Profile country code |
| `idVerificationStatus` | ID checkpoint status |
| `selfieVerificationStatus` | Selfie checkpoint status |
| `verificationAttempts` | Counter |
| `profileCreatedAt` | ISO timestamp |
| `profileUpdatedAt` | ISO timestamp |
| `email`, `fullName` | **PII** — only if explicitly enabled |
| `externalRef` | Tenant-supplied reference from verification API (`integrationExternalRef`) |
| `metadata` | Tenant-supplied key/value map (`integrationMetadata` on profile) |

If a selected field has no value, it may be omitted from `data`.

## Supplying `externalRef` and `metadata` from the API

Optional body fields on **ID verification** (`POST …/verify-id` shape) and **selfie verification** (`POST …/verify-selfie` shape):

| Field | Type | Limits |
|-------|------|--------|
| `integrationExternalRef` | string | Max 256 characters, trimmed |
| `integrationMetadata` | object of string keys and string values | Max 20 keys; key length ≤ 64; value length ≤ 512; total serialized size ≤ 4096 bytes |

When sent, values are persisted on the **profile** for that session and may appear in webhook `data` if `externalRef` / `metadata` are enabled in webhook optional fields.

## Subscriptions & dashboard

Webhook URL, signing secret, **event subscriptions**, and **optional `data` field allowlist** are managed per tenant on `/integrations` (`integrationWebhookUrl`, `integrationWebhookSecret`, `integrationWebhookEvents`, `integrationWebhookDataFields` on `KycConfiguration`).

## Replay (admin API)

Admin can re-send terminal webhooks: `POST /admin/webhooks/replay/:profileId` with optional `?useStoredDelivery=true` — same payload-building rules apply for live replay; stored replay reuses the saved JSON verbatim.
