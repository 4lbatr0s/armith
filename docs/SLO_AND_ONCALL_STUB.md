# SLO and on-call (starter targets)

Backlog: [`docs/TODO_PRODUCT_BACKLOG.md`](TODO_PRODUCT_BACKLOG.md).

**Internal targets — revise after a 30-day traffic baseline.** Replace numbers with measured SLOs; add contractual SLAs separately with legal/sales.

## Uptime / availability

- API availability (monthly): **99.5%** — measured against successful `GET /health` from synthetic probes (configure probes in your monitoring stack).
- Health checks: at minimum one external synthetic hitting `/health` per region you care about.

## Latency (starter — excludes upstream LLM / third-party latency)

- `POST /kyc/id-check` (authenticated path): **p50 under 250 ms**, **p95 under 1500 ms** for application time only (time spent in your API before calling Groq or other providers).
- Webhook dispatch: **p95 under 10 s** from terminal status change to first delivery attempt (per your `WebhookDelivery` / worker semantics).

## Error budget & paging

- **Acknowledgement:** sev-1 **under 30 minutes**, sev-2 **under 4 hours** (business hours vs 24/7 is a policy choice — document whichever you adopt).
- **Rotation / escalation owner:** `[ROTATION_OWNER]` — assign a named on-call rotation or alias; not a numeric SLO.
- **When to page:**
  - HTTP **5xx** rate ≥ **5×** the rolling **1 h** baseline for **≥ 5 minutes**, or
  - **`/health`** fails **3 consecutive** synthetic checks.

Contractual customer-facing SLAs and named on-call contacts belong in runbooks / contracts — keep this file as engineering-facing defaults only.
