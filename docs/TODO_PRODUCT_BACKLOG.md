# Product backlog

Single planning doc under `docs/`. **`[P]`** = product/legal/process; **`[E]`** = engineering. **§2** = agent/multi-agent/tooling (defer). Historical roadmap / runbook corpus was trimmed from the repo—**this file lists only work that is not closed yet.**

**Working docs (decision / stub):** [Retention checklist](RETENTION_DECISION_CHECKLIST.md) · [Billable-unit guide](BILLABLE_UNIT_DECISION_GUIDE.md) · [SLO / on-call stub](SLO_AND_ONCALL_STUB.md)

---

## 1. Open work (everything except §2 agents)

### Engineering — verification & platform

| Priority | Item | Source (historical) |
|----------|------|----------------------|
| [P] | **R2 destructive purge enablement** — Engineering shipped exemption-aware, multi-prefix age purge (`R2_LIFECYCLE_PREFIXES`, `legalHold`, unresolved manual-review skip). **Product/legal** still signs retention windows + prefix list before `R2_LIFECYCLE_PURGE_ENABLED=1` in production. | Retention backlog |
| [P][E] | **Mongo destructive lifecycle** — Read-only terminal-profile age report shipped (`MONGO_PROFILE_AGE_DAYS` + `MONGO_LIFECYCLE_CRON`). Profile archival / hard delete / broader TTL **still blocked on business retention durations** (webhook TTL path remains via `WEBHOOK_DELIVERY_TTL_SECONDS`). | BILLING_AND_RETENTION (removed) |

### Billing & commerce

| Priority | Item | Source (historical) |
|----------|------|----------------------|
| [P] | **Billable-unit definition** — **TBD with product.** | Pricing / billing |
| [P][E] | **Commerce metering** — Stripe (or equiv.) — **defer** until billable-unit locked. See **`STRIPE_METERING_NOTE`** / README. | NEXT_IMPLEMENTATION_CHUNK (removed) |

### Observability & operations

| Priority | Item | Source (historical) |
|----------|------|----------------------|
| [P][E] | **Baseline & tune SLOs** — Starter numbers live in [`docs/SLO_AND_ONCALL_STUB.md`](SLO_AND_ONCALL_STUB.md); replace with measured targets after traffic baseline; add paging integrations and contractual SLAs as needed. | RUNBOOK_SLO (removed) |

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
