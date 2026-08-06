# Backend Schema
## Fitness & Nutrition Coach Chatbot

---

PostgreSQL. Single-user MVP, but every table is keyed by `user_id` so multi-user support later doesn't require restructuring.

### Tables

**users**
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| telegram_chat_id | text, unique | identifies the user's Telegram conversation |
| timezone | text | for scheduling the Saturday check-in correctly |
| cuisine_preference | text | free-form or enum |
| created_at | timestamp | |

**metrics** — one row per check-in
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users | |
| weight | numeric | |
| body_fat_pct | numeric, nullable | |
| other_metrics | jsonb, nullable | flexible for waist measurement, etc. |
| recorded_at | timestamp | |

**targets** — one row per weekly recalculation
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users | |
| metrics_id | uuid, FK → metrics | the check-in that produced this target |
| goal_type | text | fat_loss / muscle_gain / recomp / maintenance |
| calorie_target | int | |
| protein_target_g | int | |
| effective_from | timestamp | |

**meal_plans** — one row per week's generated plan
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users | |
| targets_id | uuid, FK → targets | |
| recipes | jsonb | structured recipe list (name, ingredients, steps, calories, macros) |
| shopping_list | jsonb | grouped by grocery section |
| week_of | date | |

**meals** — ad-hoc logged food
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users | |
| description | text | raw user input |
| calories | int | |
| macros | jsonb | protein/carbs/fat |
| logged_at | timestamp | |

**workout_splits** — versioned, so history is preserved when the split changes
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users | |
| version | int | increments each time the split changes |
| days | jsonb | structure: day → type (lift/cardio/rest) → exercises |
| reason_for_change | text, nullable | why this version was created (goal change, plateau, user request) |
| active_from | timestamp | |

**workout_logs** — actual performance
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users | |
| split_id | uuid, FK → workout_splits | which split version this session belongs to |
| exercise | text | |
| sets_reps_weight | jsonb | |
| logged_at | timestamp | |

**watch_metrics** — from Health Auto Export
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| user_id | uuid, FK → users | |
| metric_type | text | steps / heart_rate / active_calories / workout |
| value | jsonb | flexible shape depending on metric_type |
| recorded_at | timestamp | |

### Relationships summary

- `users` is the root — everything else references it
- `metrics` → `targets` (each target recalculation is triggered by a metrics check-in)
- `targets` → `meal_plans` (each week's plan is generated against a specific target set)
- `workout_splits` is versioned rather than mutated in place, so the coach can reference "what changed and why" in conversation
- `watch_metrics` is populated independently of chat activity, purely from the webhook

### Auth

Single-user MVP: the Telegram `chat_id` itself is the identity — no separate login/password system needed. If multi-user is added later, this becomes the natural foreign key without restructuring.
