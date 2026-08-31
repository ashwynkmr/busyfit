# Technical Requirements Document (TRD)
## Fitness & Nutrition Coach Chatbot

---

### 1. Stack overview

| Layer | Choice | Why |
|---|---|---|
| Backend | Node.js + TypeScript | Pairs naturally with Telegram bot libraries; Claude Code scaffolds it well |
| Bot interface | `grammy` or `node-telegram-bot-api` | Telegram Bot API wrapper, free, no approval process |
| Database | PostgreSQL | Relational fits this data well — users, metrics, meals, workouts all reference each other |
| LLM | Claude API (Sonnet for generation/coaching; cheaper model for intent routing) | Structured plan generation + open-ended coaching in one system |
| Hosting | Northflank (Sandbox plan) | Free forever, always-on (no sleep/cold-start), includes cron jobs + a database — no architecture change from local dev. See §1.1 |
| Watch data | Health Auto Export (iOS app) → webhook | No custom iOS app needed; Apple only allows HealthKit reads from an installed app, so this app bridges that gap |

### 1.1 Hosting decision (revisited 2026)

The original plan above named Railway or Fly.io on the assumption their free tiers would
cover an always-on single-user process. That's no longer true — both providers' free
allowances have shrunk or disappeared since. Revisited with current pricing/product
research:

| Option | Cost (single-user MVP) | Always-on? | Architecture change required |
|---|---|---|---|
| Railway (Hobby) | ~$5-10/month (Hobby plan fee + usage-metered CPU/RAM for the bot process and a Postgres addon) | Yes | None |
| Fly.io (pay-as-you-go) | ~$5-7/month | Yes | None (but no free allowance for new accounts as of 2026) |
| Render (free tier) | $0/month | No — sleeps after 15 min idle, ~10-30s cold start on wake | None to deploy, but breaks the reliability requirement in §7 (cron-fired Saturday check-ins can't fire while asleep) |
| Google Cloud Run + Cloud Scheduler | $0/month at this scale (2M requests/month always-free) | No — scales to zero between requests, but request-driven rather than idle-timeout-based | Yes — the bot must run in Telegram *webhook* mode instead of `grammy`'s current long-polling `bot.start()`, and the Saturday check-in cron must move from in-process `node-cron` to Cloud Scheduler hitting an endpoint |
| **Northflank (Sandbox plan) — chosen** | **$0/month** | **Yes — 2 always-on services never sleep** | **None** |

**Why Northflank:** its free "Sandbox" plan (perpetual, not a trial) provides 2 always-on
services, 2 cron jobs, and 1 database at no cost — matching the original Railway/Fly.io
value proposition without the architecture changes Cloud Run would require. It asks for a
card at signup as anti-abuse verification, but the Sandbox tier itself carries no recurring
billing; a card is only charged if the account is manually upgraded to Pay-As-You-Go.
Compute is capped small (roughly 0.1-1 vCPU, ~512MB per service on Sandbox), which is ample
for a single-user bot process plus Postgres.

**Cloud Run tradeoff, worth naming explicitly:** for someone already building on Cloud Run
elsewhere, it's a reasonable alternative and arguably the more "correct" serverless
architecture for a webhook-driven workload. It wasn't chosen here specifically because this
app's design leans on an always-on process (in-process `node-cron`, `grammy` long-polling)
that Northflank's Sandbox plan supports as-is — Cloud Run would mean rearchitecting both of
those rather than just picking a new deploy target.

### 2. Why not WhatsApp (for now)

WhatsApp requires Meta's Business API (or a Twilio wrapper), business verification, and template approval for messages sent outside a 24-hour reply window. Telegram's Bot API is free and has no approval process. Build on Telegram first; WhatsApp can be added later as a second bot interface on the same backend.

### 3. Context window / state management (design principle — applies to every LLM call)

The Claude API is stateless — nothing persists between calls unless the backend includes it. The database is the source of truth, not the chat transcript. Every call to Claude is built from:

1. A system prompt establishing the coach persona
2. Current structured state pulled fresh from the DB (latest metrics, active targets, current split, preferences)
3. Only a bounded window of recent conversation (last N messages), not the full history
4. The specific task or question at hand

This avoids two problems: token cost growing indefinitely, and quality degrading from "lost in the middle" effects in long transcripts. Structured recall from the DB replaces the need to replay history.

### 4. Claude API usage patterns

- **Intent routing** — classify each incoming message (log entry / plan request / open-ended question) using a cheap, fast model call
- **Structured generation** — meal plans, shopping lists, workout splits use a JSON output schema so the bot can reliably parse results into the database and reformat them for Telegram
- **Open-ended coaching** — system prompt + current state + question, natural conversation, no schema constraint
- **Proactive messages** — Saturday check-in escalation copy, daily workout push, and healthy-habit nudges are each a small Claude call (coach persona system prompt + minimal context) so the humor/personality stays consistent and non-repetitive, rather than static templates. Cheap/fast model tier is sufficient for all three — none require Sonnet-level reasoning

### 4.1 New scheduled jobs (proactive messaging)

Extends the existing Saturday check-in cron pattern (per-user `node-cron` jobs keyed to `users.timezone`):

- **Check-in escalation**: follow-up jobs at T+4h/T+8h/Sunday-morning/Sunday-evening after the Saturday prompt, each checking whether the check-in flow already completed before sending (skip silently if it has)
- **Daily workout push**: one job per user at their chosen send time (new `users.workout_push_time` preference, captured at onboarding)
- **Healthy-habit nudges**: frequency-driven (`users.nudge_frequency`: off/low/medium/high) — rather than a fixed cron time, pick a new random time within a waking-hours window each day so it doesn't feel mechanical

Northflank's Sandbox plan (§1.1) includes 2 free platform-level cron jobs as headroom, if any of the above ever needs to run outside the main process rather than as another in-process `node-cron` job.

### 5. Cost model

Pay-as-you-go, billed per token, separate rates for input and output (output costs more).

| Component | Estimated cost (single user) | Depends on |
|---|---|---|
| Claude API | ~$4-7/month | Number of daily interactions, size of weekly generated content (recipes/shopping lists are the largest single output), model choice, plus the new proactive messages (check-in escalation, daily workout push, habit nudges) — all small/cheap-tier calls, but they add up to several extra calls per day at "high" nudge frequency |
| Hosting (Northflank Sandbox) | $0/month | Free-forever plan, always-on, no usage metering to exceed at single-user scale (see §1.1) |
| Health Auto Export | Small one-time or subscription fee | Fixed cost, doesn't scale with usage — check current in-app pricing |
| Telegram | Free | N/A |

**What drives cost up:**
- More users (roughly linear — each additional user adds their own daily interaction + weekly generation cost)
- Larger generated outputs (longer recipe lists, more detailed plans)
- Using a more expensive model for routine tasks that a cheaper one could handle

**Total estimate for MVP (single user): ~$4-7/month**, almost entirely Claude API cost now that hosting is free (Northflank Sandbox, §1.1) — Health Auto Export's fee is the only other line item.

### 6. External APIs / integrations

- Telegram Bot API (free)
- Claude API (Anthropic)
- Health Auto Export REST API export (webhook receiver on our backend)
- Postgres (managed via hosting provider or a free-tier add-on)

### 7. Non-functional requirements

- Bot must respond to logging/questions within a few seconds (no long synchronous LLM calls blocking the chat)
- Saturday check-in must fire reliably via a scheduled job (cron), not rely on the user initiating it
- All health data stored is private to the single user; no third-party sharing

### 8. Dashboard addendum (v2)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) | Simplest way to get a small set of chart/table pages with server-side data fetching; no client-side auth or complex state needed since it's read-only |
| Charts | A lightweight charting lib (e.g. Recharts) | Just weight/body-fat trend lines and simple bar/heatmap views — no need for anything heavier |
| API layer | A few read-only JSON endpoints added to the existing backend process (e.g. via a minimal HTTP server such as Fastify, since the current backend is bot-only with no HTTP server yet) | Keeps one backend process/deploy rather than standing up a separate service |
| Hosting | Same Northflank project as the bot backend | No new infra — deploy the dashboard as the project's second free Sandbox service alongside the existing bot process (§1.1), still within free-tier usage |
| Data layer | None new — reads directly from the existing Postgres tables (`metrics`, `targets`, `meal_plans`, `meals`, `workout_splits`, `workout_logs`) | All data the dashboard needs (trends, adherence, goal progress) already exists from Phases 1-4; this is aggregation/read queries only, no new tables |

**Note on exposure:** since this serves personal health data over the public internet with no login system (per PRD scope — single-user, no new auth), consider a minimal protection layer at deploy time (e.g. a shared-secret query param/header, or hosting-provider-level access restriction) rather than leaving the dashboard fully open. This is a deployment-time consideration, not a new auth system in the app itself.
