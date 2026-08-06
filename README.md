# Busyfit — AI Fitness & Nutrition Coach

A Telegram bot that acts as a personal fitness coach: it runs onboarding, generates
Sunday-meal-prep plans and shopping lists, programs a dynamic workout split, and answers
open-ended coaching questions — all grounded in a Postgres database of the user's actual
metrics and history, not the chat transcript.

Built end-to-end with [Claude Code](https://claude.com/claude-code), working from a set of
planning docs (`docs/`) rather than ad-hoc prompting — see [`prompt-log.md`](./prompt-log.md)
for the actual session-starting prompts used at each phase.

## Why this exists

Most fitness apps split meal tracking, workout programming, and coaching advice across
separate tools. This project explores a different shape: one conversational interface,
backed by a relational schema that's the actual source of truth, with an LLM doing the parts
that benefit from reasoning (goal derivation, recipe generation, open-ended Q&A) while
everything else — targets math, scheduling, state transitions — stays deterministic code.

## How it works

```
Telegram (grammy)
      │
      ▼
Intent router (Claude, cheap/fast model)
      │
      ├─ multi-step flow in progress? → onboarding / weekly check-in state machine
      ├─ log request → structured chat commands (/logmeal, /logworkout)
      ├─ plan request → stub (meal/workout plans are check-in-driven, not on-demand)
      └─ open question → coach: system prompt + live DB state + bounded conversation
                          history → Claude (Sonnet-tier)

Postgres (source of truth)
  users → metrics → targets → meal_plans
        → workout_splits → workout_logs
        → conversation_messages
```

Key design principle (see `docs/02-trd.md` §3): the database is the source of truth for
coaching context, not the chat transcript. Every Claude call is built from current structured
state (latest metrics, active targets, active split, preferences) plus a bounded window of
recent messages — never the full history. This keeps responses grounded and avoids
ever-growing context/cost.

## Features (current)

- **Onboarding** — structured Q&A (weight, age, height, sex, activity level, body fat,
  target, timeline, training experience, dietary restrictions, injuries, cuisine), accepting
  flexible units (`70kg`/`154lbs`, `175cm`/`5'9"`). Re-running onboarding skips fields already
  on file — only the goal-defining questions get re-asked.
- **Deficit calculator** — Mifflin-St Jeor BMR × activity multiplier, goal-based calorie/protein
  targets, goal type (fat loss / muscle gain / recomp / maintenance) derived from current vs.
  target weight rather than declared upfront.
- **Initial workout split generation** — Claude-generated, goal- and injury-aware, via a
  forced tool-use call for reliable structured output.
- **Weekly check-in** — weight → body fat → "what are you feeling this week" (cuisine/format/
  "surprise me") → generates a Sunday-batch-prep plan: one recipe per meal type sized for the
  week, full macros including fiber, 2-3 rotation variations per recipe, and a shopping list
  in real grocery-purchasable quantities.
- **Scale-photo check-in** — send a photo of a smart scale app and Claude's vision reads
  weight, body fat %, and whatever else is on screen (muscle mass, visceral fat, BMR, etc.),
  completing a full check-in automatically.
- **General supplement guidance** — qualitative, age/sex/diet-based baseline suggestions
  generated once at onboarding, explicitly not framed as a precise prescription.
- **Open-ended coaching Q&A** — grounded in live metrics/targets/split, not generic advice.
- **Saturday check-in scheduling** — per-user cron job keyed to their stored timezone.
- **"What's today's workout"** — resolves the day-of-week in the user's timezone against the
  active split, shows last-logged performance per exercise, and auto-shortens the session
  when the user mentions a time limit.
- **Dynamic split adjustment** — Claude evaluates a change request against the current split
  and recent logged performance, then generates and saves a new split version — history is
  retained in `workout_splits`, never overwritten.
- **Progressive overload note** — `/logworkout` compares each new log to the last entry for
  that exercise and calls out weight/rep progress or regression.

## Planned

Apple Watch data sync, weekly adherence summaries, a read-only trends dashboard, and a
proactive-messaging layer (escalating check-in reminders, daily workout push, habit nudges)
with a more personal, humor-forward persona. Full phase-by-phase breakdown in
[`docs/06-implementation-plan.md`](./docs/06-implementation-plan.md).

## Stack

Node.js + TypeScript (ESM) · [grammy](https://grammy.dev) (Telegram) · PostgreSQL +
[node-pg-migrate](https://github.com/salsita/node-pg-migrate) · Claude API
([@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript)) ·
[node-cron](https://github.com/node-cron/node-cron)

Sonnet-tier model for generation/coaching, a cheaper/faster tier for intent routing — see
`docs/02-trd.md` for the full cost model and rationale.

## Project structure

```
src/
  bot/            Telegram wiring: command handlers, message routing, photo download
  llm/            Anthropic client, system prompt, generators (meal plan, workout split,
                  supplement guidance, scale-photo parsing), DB-state context builder
  onboarding/     Step sequence, unit parsing, deficit calculator
  checkin/        Weekly check-in flow + shared check-in completion logic
  flows/          Generic multi-step conversation state machine (used by onboarding + check-in)
  workout/        Active-split lookup, today's-workout resolution, split adjustment, log history
  scheduler/      Cron scheduling
  db/             Pool + migrations
docs/             Planning docs: PRD, TRD, app flows, UI/UX brief, schema, implementation plan
```

## Planning docs

This project is built from docs, not vibes — each is scoped to answer one question:

| Doc | Answers |
|---|---|
| [`01-prd.md`](./docs/01-prd.md) | What are we building, for whom, and why |
| [`02-trd.md`](./docs/02-trd.md) | Stack, architecture principles, cost model |
| [`03-app-flow.md`](./docs/03-app-flow.md) | Every chat flow and what triggers it |
| [`04-ui-ux-brief.md`](./docs/04-ui-ux-brief.md) | Persona, tone, message formatting |
| [`05-backend-schema.md`](./docs/05-backend-schema.md) | Database tables and relationships |
| [`06-implementation-plan.md`](./docs/06-implementation-plan.md) | Build order, phase by phase |

## Running it locally

Requires Node 18+, a Postgres instance, a Telegram bot token
([@BotFather](https://t.me/BotFather)), and an [Anthropic API key](https://console.anthropic.com).

```bash
npm install
cp .env.example .env   # fill in TELEGRAM_BOT_TOKEN, DATABASE_URL, ANTHROPIC_API_KEY
npm run migrate        # applies all migrations in src/db/migrations
npm run dev             # tsx watch — polls Telegram, hot-reloads on save
```

Other scripts: `npm run build` (typecheck + compile), `npm run start` (run compiled output).

## Security & privacy

- No secrets in this repo. `.env` is gitignored and was never committed; `.env.example` only
  lists the variable names the bot expects (`TELEGRAM_BOT_TOKEN`, `DATABASE_URL`,
  `ANTHROPIC_API_KEY`) — no real values, no history to scrub.
- `src/config.ts` fails fast at startup if any required env var is missing, rather than
  running with a silently-undefined credential.
- This is a single-user MVP: all user data (metrics, targets, logs, conversation history)
  lives in your own Postgres instance, not a shared or hosted one — nothing here talks to a
  third-party datastore.

## Notes on how this was built

This is a single-user MVP built session-by-session with Claude Code, one implementation
phase at a time (`docs/06-implementation-plan.md`), with planning docs kept in sync *before*
each round of code changes — see `prompt-log.md` for the actual prompts. A few decisions
worth calling out:

- Schema is single-user but every table is keyed by `user_id` from day one, so multi-user
  isn't a rewrite later.
- Structured LLM outputs (meal plans, workout splits, intent classification, scale-photo
  parsing) all use forced tool-use calls rather than prompted free-text JSON — reliable
  parsing without a validation layer bolted on after the fact.
- The DB-as-source-of-truth principle (vs. replaying chat history) was a deliberate call to
  keep token cost bounded and answers grounded as the conversation history grows over time.
