# Product backlog

**`[P]`** = product/legal/process · **`[E]`** = engineering · **`§2`** = agent/multi-agent (defer).

---

## 1. Open work (everything except §2 agents)

### Engineering — verification & platform

| Priority | Item | Source (historical) |
|----------|------|----------------------|
| [P] | **R2 destructive purge enablement** — Product/legal signs retention windows and prefix list before `R2_LIFECYCLE_PURGE_ENABLED=1` in production. | Retention backlog |
| [P][E] | **Mongo destructive lifecycle** — Terminal-profile age report optional via `MONGO_PROFILE_AGE_DAYS` when `MONGO_LIFECYCLE_CRON` runs (`WEBHOOK_DELIVERY_TTL_SECONDS` elsewhere). Profile archival / hard delete blocked on retention policy lock. | BILLING_AND_RETENTION (removed) |

### Billing & commerce

| Priority | Item | Source (historical) |
|----------|------|----------------------|
| [P] | **Billable-unit definition** — **TBD with product.** Lock: grain (subject vs API call vs terminal outcomes), terminal statuses counted, duplicates/idempotent retries (within TTL), manual-review billing moment, quota vs metering with `quotaService`. | Pricing / billing |
| [P][E] | **Commerce metering** — Stripe (or equiv.) — **defer** until billable-unit locked. See **`STRIPE_METERING_NOTE`** / README. | NEXT_IMPLEMENTATION_CHUNK (removed) |

### Observability & operations

| Priority | Item | Source (historical) |
|----------|------|----------------------|
| [P][E] | **Baseline & tune SLOs** — Starter internal targets (replace after traffic baseline): API **99.5%/month** availability vs synthetic `GET /health` (**200**, JSON `status: "ok"`); probe e.g. 60 s interval, 8–10 s timeout, alert after 3 consecutive failures. `POST /kyc/id-check` app-side **p50 under 250 ms**, **p95 under 1500 ms** excluding upstream LLM. Webhook first-attempt dispatch **p95 under 10 s** from terminal status change. Page when **5xx** rate ≥ **5×** rolling **1 h** baseline for **≥5 min** or `/health` fails 3 probes in a row; ack targets **sev-1 under 30 min**, **sev-2 under 4 h**. Add paging integrations and contractual SLAs after measurement. | RUNBOOK_SLO (removed) |

---

## 2. Agents, tools, multi-agent (defer)

Anything with **multi-step LLM/agent orchestration**, **tool graphs**, **autonomous remediation**, or **unbounded per-check cost**:

| Item | Notes |
|------|-------|
| **Agent/tool loop** | Feature flag **`AGENT_VERIFY_ENABLED`**, budgets, deterministic fallbacks. |
| Dependencies | Tool surface audit, cost accounting, safety/redaction parity, offline eval harness. |

**Explicitly out of scope:** swarm, customer MCP-as-product, autonomous dispute bots.

---

## 3. Product / legal / process (not code-only)

| Priority | Track |
|----------|-------|
| [P][E] | Paging/on-call naming; contractual SLAs |
| [P] | SOC2 readiness calendar; pentest; SIG/CAIQ |
| [P] | Hosting region / DPA / incident SLA prose for regulated buyers |
| [P][E] | **`REACT_APP_*_EMAIL`** live + response-time commitments at launch |

---

*Remove rows when closed.*
