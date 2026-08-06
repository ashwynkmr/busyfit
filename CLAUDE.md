# Project: Fitness & Nutrition Coach Chatbot

A Telegram bot acting as an expert fitness coach — dynamic meal planning, dynamic
workout programming, Apple Watch sync, and open-ended coaching Q&A.

## Planning docs (read the relevant one for the phase you're working on — don't need all of them every session)

- `docs/01-prd.md` — what we're building and for whom (features, user stories, scope)
- `docs/02-trd.md` — tech stack, APIs, cost model
- `docs/03-app-flow.md` — every chat flow and trigger
- `docs/04-ui-ux-brief.md` — tone, persona, message formatting
- `docs/05-backend-schema.md` — database tables and relationships
- `docs/06-implementation-plan.md` — build order, phase by phase

## Working agreement

- Single user (one Telegram chat ID) for MVP — don't build multi-user auth yet, but don't
  hardcode assumptions that would block adding it later.
- The database is the source of truth for coaching context, not the chat transcript.
  Every Claude API call should be built from current structured state (metrics, targets,
  active split, preferences) plus a bounded window of recent conversation — never replay
  full history.
- Work in phases matching `docs/06-implementation-plan.md`. Start a fresh session per phase
  rather than one long-running session.
- Prefer Sonnet for plan/recipe generation and coaching; a cheaper/faster model is fine for
  simple intent routing (is this a log, a plan request, or a question).

## Current status

**Phases 1-3 are complete** (with Phase 3 substantially reworked after initial build — see below).
Node.js + TypeScript, ESM.

- `grammy` for the Telegram bot, `pg` for Postgres, `node-pg-migrate` for migrations,
  `@anthropic-ai/sdk` for Claude, `node-cron` for scheduling
- `src/config.ts` — env loading (`TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `ANTHROPIC_API_KEY`),
  fails fast if missing
- `src/db/pool.ts` — shared `pg` Pool
- `src/db/migrations/` — one file per table from `05-backend-schema.md` plus incremental
  `users` columns added as Phase 3 evolved (flow state, profile fields, grocery/supplement
  prefs) — see the migration filenames for the exact sequence
- `src/bot/` — bot setup, command handlers, Telegram photo download, long-message chunking
- `src/llm/` — Anthropic client, system prompt, intent router, DB-state context builder,
  meal plan / workout split / supplement guidance / scale-photo generators (each a forced
  tool-use call for structured output)
- `src/onboarding/` — dynamic step sequence (skips fields already on file on re-run),
  flexible unit parsing (kg/lbs, cm/ft-in), Mifflin-St Jeor deficit calculator
- `src/checkin/` — Saturday check-in flow (weight → body fat → weekly meal-style intake →
  generated plan) and the shared `completeCheckin` used by both the manual flow and photo
  check-ins
- `src/flows/` — generic multi-step conversation state machine shared by onboarding/check-in
- `src/scheduler/` — per-user Saturday check-in cron, keyed to `users.timezone`
- `src/index.ts` — entrypoint: verifies DB connection, schedules cron jobs, starts polling
- npm scripts: `npm run dev` (tsx watch), `npm run build`, `npm run start`, `npm run migrate`

Gotchas hit along the way (already fixed, but worth knowing):
- `node-pg-migrate` needs an explicit `up` action or it silently prints help and does nothing
- the migrations-dir flag is `-m`/`--migrations-dir`, not `--dir`
- Claude tool-use calls generating large structured output (meal plans) can silently truncate
  if `max_tokens` is too low — the tool JSON comes back incomplete rather than erroring, so
  always validate required arrays are non-empty before writing to the DB
- Telegram messages need `parse_mode` set explicitly and should be split into one message per
  logical unit (e.g. one per recipe) rather than concatenated — matches `04-ui-ux-brief.md`

Not yet built: dynamic workout split adjustment (Phase 4), Apple Watch webhook (Phase 5),
weekly adherence summary (Phase 6), read-only dashboard (Phase 7), proactive
messaging/persona rework — escalating Saturday nag, daily workout push, habit nudges
(Phase 8). See `docs/06-implementation-plan.md` for the full phase breakdown.
