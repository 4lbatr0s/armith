# Product backlog

Single planning doc under `docs/`. **`[P]`** = product/legal/process; **`[E]`** = engineering. **§2** = agent/multi-agent/tooling (defer). Historical roadmap / runbook corpus was trimmed from the repo—**this file lists only work that is not closed yet.**

---

## 1. Open work (everything except §2 agents)

### Engineering — verification & platform

| Priority | Item | Source (historical) |
|----------|------|----------------------|
| [E] | **Object-storage lifecycle beyond delete-opt-in** — scheduled purge / batch jobs for aged R2 keys once retention windows are fixed (coordinate with Mongo profile lifecycle). Cron placeholder / operator wiring TBD (`R2_LIFECYCLE_CRON` etc.). | Retention backlog |
| [P][E] | **Mongo lifecycle beyond webhook TTL** — profile/archival or broader TTL execution **blocked on business retention durations** (webhook TTL path already exists via env). | BILLING_AND_RETENTION (removed) |
| [E] | **Manual review** — optional richer audit trail / additional webhook event types beyond current queue semantics. | Phase F backlog |

### Billing & commerce

| Priority | Item | Source (historical) |
|----------|------|----------------------|
| [P] | **Billable-unit definition** — **TBD with product.** | Pricing / billing |
| [P][E] | **Commerce metering** — Stripe (or equiv.) — **defer** until billable-unit locked. See **`STRIPE_METERING_NOTE`** / README. | NEXT_IMPLEMENTATION_CHUNK (removed) |

### Observability & operations

| Priority | Item | Source (historical) |
|----------|------|----------------------|
| [P][E] | **Replace `[bracket]` SLO numbers** once traffic baselined; paging/on-call wording. | RUNBOOK_SLO (removed) |
| [E] | **Synthetic uptime probes** — point external monitor at **`GET /health`** (vendor config + README Observability notes). | RUNBOOK_SLO (removed) |

### Integrator ergonomics & API parity

| Priority | Item | Source (historical) |
|----------|------|----------------------|
| [E] | **Webhook replay enhancements** — optional replay using stored **`WebhookDelivery`** payload vs current path. | PUBLIC_API_ERRORS (removed) |

---

## 2. Agents, tools, multi-agent (defer)

Anything with **multi-step LLM/agent orchestration**, **tool graphs**, **autonomous remediation**, or **unbounded per-check cost**:

| Item | Notes |
|------|--------|
| **Agent/tool loop** | Feature flag **`AGENT_VERIFY_ENABLED`**, budgets, deterministic fallbacks. |
| Dependencies | Tool surface audit, cost accounting, safety/redaction parity, offline eval harness. |

**Explicitly out of scope:** swarm, customer MCP-as-product, autonomous dispute bots.

---

## 3. Product / legal / process (not code-only)

Requires workshops, contracts, or copy—not closed in-repo without product input:

| Priority | Track |
|----------|--------|
| [P] | Billable-unit semantics (terminal vs duplicate identity) |
| [P][E] | Paging/on-call naming; contractual SLAs |
| [P] | SOC2 readiness calendar; pentest; SIG/CAIQ |
| [P] | Hosting region / DPA / incident SLA prose for regulated buyers |
| [P][E] | **`REACT_APP_*_EMAIL`** live + response-time commitments at launch |

---

*Maintenance: remove rows when closed; restore references from git history if needed.*
