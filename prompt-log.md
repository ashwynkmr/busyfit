# Prompt Log

A record of the prompts used to kick off each phase/session of this project.

## Phase 1 — Bot skeleton + database connection

Read CLAUDE.md and docs/02-trd.md and docs/05-backend-schema.md.

We're starting Phase 1 from docs/06-implementation-plan.md: bot skeleton +
database connection. Specifically:

- Set up a Node.js + TypeScript project structure
- Integrate a Telegram bot library (grammy or node-telegram-bot-api, your call)
  with a working /start command
- Connect to Postgres and create migrations for every table in
  docs/05-backend-schema.md
- Add manual meal/workout logging via simple chat commands (no Claude API
  calls yet — just prove the Telegram → backend → Postgres pipeline works
  end to end)

Don't touch anything from later phases yet. Propose a plan before writing code.

## Phase 2 — Claude integration for coaching Q&A

Read CLAUDE.md, docs/01-prd.md, and docs/04-ui-ux-brief.md.

We're starting Phase 2 from docs/06-implementation-plan.md: Claude API
integration for coaching Q&A — Claude API client setup, system prompt
implementing the coach persona, an intent router to classify incoming
messages (log / plan request / question), and wiring open-ended questions
to Claude with current DB state injected as context. Don't touch
plan/recipe generation or onboarding yet — those are later phases. Propose
a plan before writing code.

## Phase 3 — Onboarding + Saturday check-in + meal plan generation

Prompted with just "Lets just do a phase 3" — Claude proposed a plan
(onboarding flow, deficit calculator, weekly check-in, meal plan + workout
split generation via forced tool-use, cron scheduling) and confirmed a few
implementation choices (onboarding state storage, scheduling approach,
JSON generation strategy) via clarifying questions before writing code.

## Phase 3 refinement — profile depth, output structure, and product scope

Several rounds of iteration after the initial Phase 3 build, each starting
from real usage rather than a fresh spec:

- **Profile completeness**: onboarding was missing age/height/sex/activity
  level, so the deficit calculator was using a flat bodyweight heuristic
  instead of a real BMR formula. Added those fields (with flexible unit
  parsing) plus injury/limitation capture, without re-asking on every
  onboarding re-run.
- **Output structure**: raised that the check-in flow re-asked static
  profile fields, used rigid single-unit parsing, and had no way to ingest
  a smart-scale photo. Resulted in a skip-known-fields onboarding pass,
  flexible weight/height parsing, and a Claude-vision scale-photo path
  that completes a full check-in from an image.
- **A production bug**: a truncated Claude tool-call (meal plan generation
  hit `max_tokens` mid-JSON) was silently written as `null` into the DB.
  Root-caused from the stack trace, fixed by scoping the prompt down and
  adding a completeness check before any DB write, plus wrapping bot
  handlers so failures reply in Telegram instead of failing silently.
- **Product redefinition**: a conversation about how meal plans should
  actually support Sunday batch-cooking (not a unique recipe per day)
  reshaped the PRD before touching code — batch-sized recipes with
  rotation variations, real grocery-purchase-quantity shopping lists,
  fiber tracking, and general (non-personalized) supplement guidance.
  Planning docs were updated and reviewed before the implementation.
- **New scope, planned before built**: two further features — a read-only
  progress dashboard, and a more personal/humor-forward persona with
  proactive messaging (check-in nag escalation, daily workout push, habit
  nudges) — were scoped into the PRD/TRD/implementation plan as new phases
  (7 and 8) and reviewed before any code was written for them.

## Phase 4 — Workout split generation + dynamic adjustment

Prompted with "give me a super concise summary of work so far and lets
start building phase 4." Claude read `docs/06-implementation-plan.md`
(Phase 4 scope) and `docs/03-app-flow.md` flows 4-5, then extended the
existing split-generation pattern rather than introducing a new one:

- Two new intent-router categories (`workout_today`, `split_adjustment`)
  alongside the existing log/plan/question set.
- "What's today's workout" resolves the day-of-week in the user's stored
  timezone against the active split, shows last-logged performance per
  exercise, and calls a small forced-tool-use call to shorten the session
  when the user mentions a time limit.
- Split adjustment reuses the forced-tool-use pattern from initial split
  generation — Claude evaluates a change request against the current split
  and recent logs, and the result is saved as a new `workout_splits`
  version (history retained, not overwritten), matching the versioning
  already defined in the schema.
- `/logworkout` now looks up the previous log for the same exercise and
  notes weight/rep progress or regression in its reply.
