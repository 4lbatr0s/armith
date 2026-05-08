# KYC Flow

KYC Flow is a frontend + backend identity verification project.

## Canonical Documentation

- Product and API docs: `frontend/docs/`
- API reference: `frontend/docs/reference/rest-api.md`
- Architecture and flow guides: `frontend/docs/guide/`

## Environments

- Local frontend URL: `http://localhost:3000`
- Local backend URL: `http://localhost:3001`
- Render frontend (dev): `https://armith.onrender.com`
- Render backend (dev): `https://armith-backend-live.onrender.com`

### Render static frontend (React Router / Clerk)

Signing in with Clerk can **full-page navigate** to something like `/admin?__clerk_handshake=…`. The **CDN** must answer that URL with **`index.html`** so the React bundle and Clerk SDK run; otherwise Render returns plain **404** (this is unrelated to Clerk “not finding” a route — the React app never loads).

Verify (before fix expect `404`, after rewrite expect `200`):

```bash
curl -sI https://armith.onrender.com/admin | head -1
```

**Fix (Dashboard):**

1. Open the static site `[armith-frontend settings](https://dashboard.render.com/static/srv-d37rd16r433s73f08up0/settings)`.
2. Go to **Redirects / Rewrites** (or equivalent for static sites).
3. Add rule: **Source** `/*` → **Destination** `/index.html` → **Rewrite** (not redirect).

Blueprint: `render.yaml` includes this `routes` block; it only applies if this repo’s Blueprint is **connected** and the service definitions match Render. Until then, rely on the Dashboard rule above.

**React Router (production SPA):** the server must fallback to `index.html` for non-file URLs so in-app navigation works after reload or external redirects ([Create React App — CS routing](https://create-react-app.dev/docs/deployment#serving-apps-with-client-side-routing)).

**Clerk:** The `__clerk_handshake` query string is used while [propagating the session](https://clerk.com/docs/how-clerk-works/overview) in the browser; the SPA must actually load (`index.html` + JS) so Clerk can consume it — a CDN **404 on `/admin`** blocks that entirely.

## Required Environment Variables

### Frontend

- `REACT_APP_API_URL`
- `REACT_APP_CLERK_PUBLISHABLE_KEY`

### Backend

- `FRONTEND_URL`
- `FRONTEND_URLS`
- `MONGODB_URI`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `GROQ_API_KEY`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`

Use local `.env` files for local development, and set the same values in Render environment variables for deployed services.

## Product backlog

- [`docs/TODO_PRODUCT_BACKLOG.md`](docs/TODO_PRODUCT_BACKLOG.md) — planning (non-agent vs agent backlog).
- [`docs/RETENTION_DECISION_CHECKLIST.md`](docs/RETENTION_DECISION_CHECKLIST.md) — retention / purge decisions (R2 + Mongo).

Lifecycle jobs: set `R2_LIFECYCLE_CRON` / `MONGO_LIFECYCLE_CRON` for periodic ticks. **Destructive** R2 purge stays off unless `R2_LIFECYCLE_PURGE_ENABLED=1` and `R2_RETENTION_MIN_AGE_DAYS`; configure **`R2_LIFECYCLE_PREFIXES`** (or legacy `R2_LIFECYCLE_PREFIX`). Purge skips keys linked to profiles on **`legalHold`** or **unresolved manual review** (see [`docs/RETENTION_DECISION_CHECKLIST.md`](docs/RETENTION_DECISION_CHECKLIST.md)). Optional **`MONGO_PROFILE_AGE_DAYS`** enables a read-only terminal-profile age report when the Mongo lifecycle tick runs — see `backend/.env.example`.

## Public API changelog (summary — API semantic version `1`)

Canonical **`meta.api.semanticVersion`** and **`meta.policy.bundleVersion`** live in **`backend/config/public-api-meta.js`**.

- **Correlation:** optional `X-Correlation-Id`; echoed where applicable.
- **Sessions:** `GET /kyc/sessions/:id` and `GET /kyc/status/:profileId`; payload includes **`session.lifecycle`**, **`outcomeSemantics`** when terminal, **`meta.policy`** (tenant + country + **`policyPackId`** / **`policyPackVersion`** when enabled).
- **Idempotency:** `Idempotency-Key` on `POST /kyc/id-check` and `POST /kyc/selfie-check`.
- **Webhooks:** `verification.completed` / `verification.failed`; `verification.manual_review_queued`; HMAC signatures — see **`backend/services/verificationWebhook.js`**. Tenants choose which event types are delivered on **`/integrations`** (`integrationWebhookEvents` on `KycConfiguration`). Timing vs profile status is in **`docs/OUTBOUND_WEBHOOK_EVENTS.md`**.
- **Admin:** webhook deliveries list, **`DELETE /admin/verifications/:id`**, webhook replay, manual-review queue APIs, **`POST /admin/verifications/:profileId/capture-session`** (mint **`X-Verification-Session`** for read-only status polling), **`GET /admin/errors/summary`**, **`PATCH /admin/api-keys/:id`** (**`allowedCidrs`** includes IPv6 CIDR when supported).

## Observability

- **`GET /health`** — point an external uptime check at `/health` (interval, timeouts, alerts: see [`docs/TODO_PRODUCT_BACKLOG.md`](docs/TODO_PRODUCT_BACKLOG.md) §1 observability).
- **`npm run golden`** — Zod validation of LLM-shape fixtures (**`backend/scripts/golden-validation.mjs`**).
- **`npm run test:ci`** (backend) — pipeline regression tests with mocked integrations.

## Commerce / metering (deferred)

**`STRIPE_METERING_NOTE`:** Stripe (or equivalent) metering is backlog until billable-unit definition is finalized. No Stripe code ships in-repo until product locks charging semantics (`docs/TODO_PRODUCT_BACKLOG.md` §1–§3); public list pricing is indicative until metering exists.
