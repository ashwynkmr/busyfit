# Implementation Plan
## Fitness & Nutrition Coach Chatbot

---

Each phase below is designed to be one focused Claude Code session — point it at this doc plus the specific referenced doc(s), not the whole `docs/` folder at once.

### Phase 1 — Bot skeleton + database connection
**Docs to reference:** `02-trd.md`, `05-backend-schema.md`
- Set up Node.js + TypeScript project structure
- Telegram bot library integration, `/start` command
- Postgres connection, run schema migrations for all tables in `05-backend-schema.md`
- Manual meal/workout logging via chat (no LLM yet — just structured commands to confirm the DB pipeline works)

### Phase 2 — Claude integration for coaching Q&A
**Docs to reference:** `01-prd.md`, `04-ui-ux-brief.md`
- Claude API client setup
- System prompt implementing the coach persona from `04-ui-ux-brief.md`
- Intent router: classify incoming messages (log / plan request / question)
- Wire open-ended questions to Claude with current DB state injected as context
- This is the fastest path to something useful daily — ship this before the more complex generation flows

### Phase 3 — Onboarding + Saturday check-in + meal plan generation
**Docs to reference:** `03-app-flow.md` (flows 1, 2), `05-backend-schema.md`
- Onboarding question sequence, initial goal/target derivation
- Scheduled job (cron) for Saturday check-in trigger
- Deficit calculator logic
- Recipe + shopping list generation with JSON output schema
- Message formatting per `04-ui-ux-brief.md`

### Phase 4 — Workout split generation + dynamic adjustment
**Docs to reference:** `03-app-flow.md` (flows 3, 4, 5)
- Initial split generation logic (coach-determined ratio, not fixed template)
- Time-based session shortening
- User-requested and coach-initiated split changes, versioned in `workout_splits`
- Workout logging + progressive overload reference in coaching answers

### Phase 5 — Apple Watch integration
**Docs to reference:** `03-app-flow.md` (flow 7), `02-trd.md`
- Webhook endpoint for Health Auto Export
- Parse and store `watch_metrics`
- Reference watch data in coaching context (Phase 2's context injection should now include this)

### Phase 6 — Weekly summary + polish
**Docs to reference:** `03-app-flow.md` (flow 8)
- Adherence + trend summary generation
- Edge case handling from `04-ui-ux-brief.md` (ambiguous logs, skipped check-ins)
- Review cost model in `02-trd.md` against actual usage once real data exists

### Phase 7 — Dashboard
**Docs to reference:** `01-prd.md` (§10 Dashboard (v2)), `02-trd.md` (§8 Dashboard addendum)
- Read-only API endpoint(s) on the existing backend serving aggregated data: weight/body-fat trend, meal adherence by week, workout completion by week, current goal + progress toward it
- Next.js dashboard frontend: progress report (weight/body-fat trend chart), a "misses" view (weeks meal or workout targets weren't hit), current goal and progress toward it
- No write functionality — viewing only
- Deploy alongside the existing bot backend (same Railway/Fly.io project)

### Phase 8 — Proactive coaching & persona
**Docs to reference:** `04-ui-ux-brief.md` (§1 Persona, §7 Proactive messages), `01-prd.md` (§6.3), `02-trd.md` (§4.1)
- Persona rework: humor/personality woven into the system prompt per the updated `04-ui-ux-brief.md` §1
- Saturday check-in escalation: T+4h/T+8h/Sunday-morning/Sunday-evening follow-up jobs per §7.1's cadence, each a small Claude call for fresh copy, skipping silently once the check-in completes
- Daily workout push: new `users.workout_push_time` onboarding question + per-user cron job sending that day's split entry
- Healthy-habit nudges: new `users.nudge_frequency` preference (off/low/medium/high) + randomized-time daily job(s) within waking hours
- Reuse the existing per-user `node-cron` + `users.timezone` pattern from the Saturday check-in scheduler for all of the above

### Suggested Claude Code session cadence

- One session per phase, fresh context each time
- Use Plan Mode before large changesets within a phase
- Reserve Sonnet for generation-heavy work (Phases 3-4); a cheaper/faster model is sufficient for intent routing (Phase 2) — revisit cost model in `02-trd.md` if usage grows
