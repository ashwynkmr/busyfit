# Product Requirements Document (PRD)
## Fitness & Nutrition Coach Chatbot

---

### 1. Summary

A Telegram-based chatbot that acts as a personal fitness coach and nutrition planner. It generates weekly meal plans and shopping lists based on the user's body metrics and goals, runs a dynamic strength + cardio training program, syncs with Apple Watch health data, and answers open-ended fitness/nutrition questions as an expert coach would — all through natural chat, no separate app to install.

### 2. Problem statement

Existing fitness apps split meal tracking, workout programming, and coaching advice across separate tools (MyFitnessPal, Hevy, Fitbod, a human coach). None of them combine all three in one place, adapt the plan automatically as metrics change, or feel like talking to a coach rather than filling out a form.

### 3. Target user (v1)

A single primary user (expandable to friends/family later):
- Goal: body recomposition — lose fat, build muscle, visible abs in 8-10 weeks
- Has a full gym and an Apple Watch
- Wants 5-6 training days/week (3 lifting + 2-3 cardio/abs/swim/run)
- Meal-preps on Sundays — wants one batch-cookable recipe per meal type (breakfast/lunch/dinner), not a unique recipe every day, plus a shopping list sized in real purchase quantities from their grocery store (HEB)
- Wants to interact primarily through chat (Telegram); a read-only dashboard (v2) supplements chat for the visual trend views chat can't show well

### 4. Goals

- Automate weekly meal planning and shopping lists based on current body metrics
- Determine and continuously adjust the user's goal (fat loss, muscle gain, recomp, maintenance) from onboarding questions and ongoing metrics, rather than a fixed goal set once
- Provide a dynamic, adjustable training split that the coach can reshape week to week based on progress and stated preference
- Let the user log meals and workouts conversationally
- Answer open-ended coaching questions grounded in the user's actual data and history
- Pull Apple Watch data automatically so logging isn't all manual

### 5. Non-goals (out of scope for MVP)

- Native iOS/Android app — Telegram is the interface
- Photo-based meal logging
- Multi-user support (architecture should allow it later, but MVP ships single-user)
- Automated swimming-specific coaching (handled generically as "cardio" for now)
- Push notifications beyond the Saturday check-in escalation, daily workout push, and healthy-habit nudges — no other proactive message types (e.g. no meal-time reminders) in this round

### 6. MVP feature list

#### 6.1 Meals / diet module
- **Onboarding goal-setting**: on first use (and whenever the user wants to change direction), the coach asks a structured set of questions — current weight, body fat %, target, timeline, training experience, dietary restrictions — and derives the goal and starting targets from the answers, rather than the user declaring a fixed goal upfront
- **Saturday check-in**: bot proactively messages asking for weight, body fat %, and any other tracked metrics
- **Deficit calculator**: recalculates weekly calorie/protein targets from updated metrics and current goal — goal itself can shift over time (e.g. recomp → cut) based on trend, not just the numbers
- **Cuisine preference capture**: remembers preferred food styles to personalize recipes
- **Weekly meal-style intake**: as part of the Saturday check-in, after weight/body fat, the coach asks what the user is in the mood for that week — a cuisine mix ("Indian and Italian"), a format preference ("just smoothies for breakfast," "overnight oats"), or an open-ended "surprise me with something new and easy" — and generation adapts accordingly rather than following a fixed template
- **Recipe generation**: one base recipe per meal type (breakfast/lunch/dinner), sized for Sunday batch-prep across the week, with variation notes (swap sauce/curry/seasoning) so it doesn't feel identical every day — not a unique recipe per meal per day. Full macros per recipe and per day: calories, protein, carbs, fat, and fiber
- **Shopping list generation**: auto-compiled from the week's recipes in real grocery-purchasable quantities (e.g. "2 lbs chicken thighs," "1 dozen eggs"), sized against a stored grocery-store preference (defaults to HEB) rather than raw per-serving math
- **General supplement guidance**: at onboarding, the coach suggests baseline micronutrient supplements (e.g. fiber, magnesium, vitamin D) from general factors — age, sex, dietary pattern/restrictions. Qualitative guidance, not precise dosing, and not tied to the weekly plan; revisable if diet/age changes and referenceable anytime via open-ended Q&A
- **Ad-hoc meal logging**: user texts what they ate; bot logs and tracks against the day's target

#### 6.2 Workout module
- **Coach-determined split**: the default is a 5-6 day week mixing lifting and cardio/abs/swim/run, but the exact ratio (e.g. 3 lift + 3 cardio, or 5 lift + 1 cardio, or an all-cardio week) is set by the coach logic based on the user's current goal and progress — not a fixed template
- **User-adjustable**: the user can request changes directly ("swap Tuesday's lift for cardio this week," "I want a cardio-only week") and the coach accommodates while keeping the plan coherent
- **Dynamic time-based adjustment**: shortens today's session instead of skipping it when time is limited
- **Reference videos**: linked on request or when a new exercise is introduced
- **Goal-based reprogramming**: regenerates the split when the user's stated goal changes or when progress data suggests a change (e.g. plateaued weight loss → more cardio volume)
- **Workout logging**: sets/reps/weight logged via chat, tracked over time for progressive overload

#### 6.3 Core chatbot / coach
- **Expert coach persona**: answers open-ended fitness/nutrition questions, grounded in the user's live metrics, targets, and history — not generic advice. Personal and dryly funny per `04-ui-ux-brief.md`, not a generic assistant voice
- **Natural-language intent routing**: distinguishes "log this," "give me a plan," and "answer my question" in one chat interface
- **Persistent state**: metrics, targets, preferences, and history stored and reused every session
- **Apple Watch data sync**: steps, workouts, heart rate flow in automatically via Health Auto Export
- **Weekly summary**: recap of adherence, weight trend, and what's changing next week
- **Saturday check-in escalation**: if the check-in prompt goes unanswered, the bot follows up with increasing (capped, humor-forward) persistence over the weekend rather than asking once and going silent — exact cadence in `04-ui-ux-brief.md` §7.1
- **Daily workout push**: sends that day's workout (or rest-day note) from the active split at a time the user sets during onboarding, so the user doesn't have to ask
- **Healthy-habit nudges**: occasional short messages about small habits (water, stretching, posture) at a user-configurable frequency (off/low/medium/high), sent at random times within waking hours

### 7. Key user stories

1. As the user, every Saturday I get asked for my weight and body fat % so my plan updates automatically.
2. As the user, I get a shopping list and recipe menu for the week that fits my calorie deficit and preferred cuisine.
3. As the user, I can text "had chicken and rice for lunch" and have it logged against today's targets.
4. As the user, I get a workout schedule that includes lifting, cardio, and abs, and can ask for a shorter version if I'm short on time.
5. As the user, I can ask "should I deload this week?" and get an answer based on my actual recent training, not a generic tip.
6. As the user, my Apple Watch activity shows up in the bot without me typing anything.
7. As the user, when I first start (or want to change direction), the coach asks me questions and sets my goal and plan from my answers, rather than me having to declare a fixed goal myself.
8. As the user, if I want more cardio one week or the coach thinks I've plateaued, the split changes accordingly rather than staying locked to a fixed template.
9. As the user, my Saturday check-in asks what I'm in the mood for that week, so my meal prep doesn't feel repetitive even though I'm batch-cooking one breakfast/lunch/dinner all week.
10. As the user, my shopping list tells me exactly what to buy at HEB in real quantities, not per-serving math I have to convert myself.
11. As the user, I get general supplement suggestions (fiber, magnesium, vitamin D, etc.) based on my age and diet, without the coach pretending to know my exact micronutrient levels.
12. As the user, I can open a dashboard to see my weight/body-fat trend, which weeks I missed meal or workout targets, and how close I am to my current goal — without having to scroll back through chat history.
13. As the user, if I forget my Saturday check-in, the coach follows up with increasing (and funny, not guilt-trippy) persistence instead of asking once and letting it slide.
14. As the user, I get that day's workout texted to me at a time I choose, so I don't have to ask the coach or scroll back to find it.
15. As the user, I occasionally get a short, funny nudge about drinking water or taking a stretch break — at a frequency I control.

### 8. Success metrics (informal, single-user MVP)

- Saturday check-in fires reliably and produces a usable plan every week
- Meal logging correctly parses free text at least most of the time
- Workout split adjusts correctly when time constraints or goals change
- Coach answers reflect current metrics/history when relevant (not generic boilerplate)

### 9. Assumptions & constraints

- Single user (Telegram chat ID) for MVP; schema should not preclude adding more later
- Backend runs on a remote host (Railway/Fly.io), not on-device
- Claude API powers both structured plan generation and open-ended coaching
- Apple Watch data arrives via Health Auto Export webhook, not a custom iOS app
- The database (not the chat transcript) is the source of truth for coaching context — each Claude API call is built from current structured state (metrics, targets, active split, preferences) plus a bounded window of recent conversation, not the full message history. This keeps responses grounded and avoids cost/quality issues from an ever-growing context window
- Grocery store is a stored per-user preference (`grocery_store`, defaults to HEB), consistent with the existing principle that schema shouldn't preclude multi-user support later

### 10. Dashboard (v2)

**Goal:** a visual, read-only view of progress the chat interface can't show well — trends over time, adherence, and goal tracking. Chat stays the primary interface for logging and coaching; the dashboard is a companion view, not a replacement.

**Features:**
- **Progress reports**: weight and body-fat % trend over time (chart)
- **Misses**: days or weeks where meal targets or workouts were skipped or missed
- **Current goals**: active goal type, calorie/protein targets, and how close the user is to their stated target (e.g. target weight)

**Scope:**
- Read-only — no logging, editing, or plan generation from the dashboard
- Single-user — no multi-tenant auth needed
- Reads from the same Postgres database the bot already writes to — no new data layer or duplicated state
