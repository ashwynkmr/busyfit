# App Flow
## Fitness & Nutrition Coach Chatbot

---

Every flow below is a Telegram conversation path. The bot has no separate UI — everything happens through chat.

### 1. Onboarding / goal-setting flow

**Trigger:** first `/start`, or user explicitly asks to change direction ("I want to change my goal")

1. Bot asks a structured sequence: current weight, body fat %, target/goal, timeline, training experience, dietary restrictions, cuisine preference
2. Bot derives an initial goal classification (fat loss / muscle gain / recomp / maintenance) and starting calorie/protein targets
3. Bot generates an initial workout split and confirms it with the user
4. State saved: `users`, `metrics` (baseline), `targets` (initial), `workout_splits` (v1)

### 2. Saturday check-in flow

**Trigger:** scheduled job, every Saturday

1. Bot proactively messages: "Time for your weekly check-in — what's your weight and body fat % this week?"
2. User replies with metrics (and optionally other tracked numbers)
3. Bot recalculates targets, checks progress trend, and may adjust the goal classification (e.g. recomp → cut) if trend suggests it
4. Bot generates: updated recipes for the week, shopping list, any workout split changes
5. Bot sends the plan as a formatted chat message (see UI/UX brief for formatting rules)
6. State saved: `metrics` (new row), `targets` (new row), `meal_plans` (new row), `workout_splits` (new version if changed)

### 3. Ad-hoc meal logging flow

**Trigger:** user sends a free-text message describing food eaten

1. Intent router classifies message as a meal log
2. Claude parses the text into estimated items, calories, macros
3. Bot logs it against today's running total and confirms back ("Logged: ~520 kcal, 40g protein. You're at 1,200/1,800 kcal today.")
4. State saved: `meals` (new row)

### 4. Workout logging flow

**Trigger:** user sends sets/reps/weight after a session, or asks "what's today's workout?"

1. If asking for today's workout: bot pulls the current split + last logged performance for that day, replies with the session (or a shortened version if the user mentions limited time)
2. If logging: Claude parses free text into structured sets/reps/weight, stores it, and can note progressive overload trend if relevant
3. State saved: `workout_logs` (new row)

### 5. Dynamic split adjustment flow

**Trigger:** user requests a change ("swap Tuesday for cardio," "I want a cardio-only week"), or the coach identifies a reason to adjust (plateau, goal change)

1. Claude evaluates the request against current split + recent progress
2. Generates an updated split, explains the reasoning briefly
3. User confirms or pushes back; bot iterates
4. State saved: `workout_splits` (new version, previous versions retained for history)

### 6. Open-ended coaching Q&A flow

**Trigger:** any message the intent router doesn't classify as a log or plan request

1. Bot builds a prompt: coach system prompt + current state (metrics, targets, split, recent adherence) + the question
2. Claude answers conversationally, grounded in the user's actual data
3. No structured output, no DB write (unless the answer implies an action, e.g. "let's switch to more cardio" → routes into flow 5)

### 7. Apple Watch sync flow

**Trigger:** Health Auto Export automation fires (periodic, iOS-dependent — see FAQ: exports pause when phone is locked)

1. Webhook endpoint receives JSON payload (steps, heart rate, workouts, etc.)
2. Backend parses and stores relevant metrics
3. No user-facing message by default — this data is available for the coach to reference in flows 2 and 6, not surfaced as a notification

### 8. Weekly summary flow

**Trigger:** scheduled, alongside or shortly after the Saturday check-in

1. Bot compiles: adherence to meal targets, workout completion, weight trend
2. Sends a short recap plus what's changing for next week
