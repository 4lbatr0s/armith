# Retention decisions (product / legal)

Backlog references: [`docs/TODO_PRODUCT_BACKLOG.md`](TODO_PRODUCT_BACKLOG.md) §1 (object-storage lifecycle, Mongo lifecycle beyond webhook TTL).

Engineering wires **dry-run ticks** by default; **destructive object purge** runs only after explicit env + checklist sign-off (`R2_LIFECYCLE_PURGE_ENABLED`, retention age, prefix list). Resolve the items below with product/legal before enabling purge in production.

## R2 object storage

- **Bucket scope:** Confirm only verification assets live in `R2_BUCKET_NAME` vs shared buckets (avoid accidental cross-domain deletes).
- **Key prefixes:** List every prefix written by the app (`kyc-uploads/`, `users/{tenantOrUser}/…`, capture URLs, etc.) and map them into **`R2_LIFECYCLE_PREFIXES`** (comma-separated). Legacy single-prefix **`R2_LIFECYCLE_PREFIX`** is still supported.
- **Retention windows:** Minimum age (days) **after creation or after terminal verification** before delete is legal/contract-compliant (per jurisdiction and customer DPAs). Code enforces a **7-day floor**; a common starting point after sign-off is **90 days** via `R2_RETENTION_MIN_AGE_DAYS` (product must confirm).
- **Exceptions (implemented):** Profiles with **`legalHold: true`** or **unresolved manual review** (`manualReviewQueuedAt` set and last `manualReviewAuditTrail` action is `QUEUED`, or trail empty) skip deletion of linked object keys during purge. Set `legalHold` in Mongo for litigation / subpoena holds.
- **Orphans:** Strategy for DB rows referencing keys that were already deleted (repair job vs soft-fail reads).

## MongoDB / application data

- **Webhook deliveries:** TTL index is optional via `WEBHOOK_DELIVERY_TTL_SECONDS`; confirm duration vs audit needs.
- **Terminal profile age (read-only):** When `MONGO_LIFECYCLE_CRON` runs, optional **`MONGO_PROFILE_AGE_DAYS`** triggers a **log-only** aggregation counting terminal profiles (`APPROVED` / `REJECTED` / `FAILED`) with `updatedAt` older than N days (by status). **No deletes.**
- **Profiles & PII:** Whether terminal profiles move to archive, hashed redaction-only, hard delete — **blocked until retention policy locks** (the reporter above supports sizing only).
- **Related collections:** IdCardValidation, SelfieValidation, WebhookDelivery, sessions — linkage and cascade rules with legal review.

## Operations

- **Dry-run cadence:** `R2_LIFECYCLE_CRON` / `MONGO_LIFECYCLE_CRON` enable periodic ticks; R2 purge is gated separately — see [`backend/.env.example`](../backend/.env.example).
- **Monitoring:** Alerts on purge job failures and on unexpected delete volumes.
