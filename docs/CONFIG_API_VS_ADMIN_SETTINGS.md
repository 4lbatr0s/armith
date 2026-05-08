# `/config` vs `/admin/settings` (KYC configuration)

Both surfaces read and write the same Mongo document model **`KycConfiguration`** for **`environment: production`**, keyed by the signed-in Clerk user id.

| Surface | Typical client | Shape | Notes |
|---------|----------------|-------|--------|
| **`GET \| PATCH /config`**, **`POST /config/preset`** | Frontend / tenants using session auth (`req.auth`) | Mirrors the stored document: **`verificationSteps`**, nested thresholds, **`version`** field for optimistic locking on **`PATCH`** | Session-only (**not** reachable with **`x-api-key`** alone). **`GET /config/presets`** is intentionally public (catalog only). |
| **`GET \| PUT /admin/settings`**, **`POST /admin/settings/reset`** | Dashboard (Clerk **`requireAuth`**) | “Product” shape: **`verificationRules`** maps onto **`verificationSteps`**, flat **`thresholds`** map via threshold patch helpers, **`integration`** for webhook URL/secret/events | Does not use the same **`version`** conflict contract as **`PATCH /config`**; updates bump **`config.version`** when rules/thresholds/integration change. |

**Recommendation:** Prefer **one** client path per app (e.g. dashboard → **`/admin/settings`** only) to avoid two writers fighting the same document. If both must exist, treat **`/config`** as advanced/IDE-style editing with explicit **`version`** checks, and **`/admin/settings`** as the primary operator UI.

**Security (post-audit):** **`POST /kyc/upload-url`** and **`POST /kyc/secure-download-url`** scope object keys to **`users/{authenticatedTenantId}/...`**. Legacy **`kyc-uploads/`** download minting requires **`KYC_STORAGE_ALLOW_LEGACY_KYC_UPLOADS_DOWNLOAD=1`**.
