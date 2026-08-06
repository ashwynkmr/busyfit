import { pool } from "../db/pool.js";
import { calculateTargets } from "../onboarding/deficitCalculator.js";
import type { ActivityLevel, Sex } from "../onboarding/deficitCalculator.js";
import { generateMealPlan } from "../llm/generateMealPlan.js";
import { clearFlow } from "../flows/stepFlow.js";
import { formatRecipeMessages, formatShoppingListMessage } from "./formatMealPlan.js";

interface UserRow {
  target_weight_kg: string | null;
  cuisine_preference: string | null;
  dietary_restrictions: string | null;
  grocery_store: string;
  age: number | null;
  height_cm: string | null;
  sex: Sex | null;
  activity_level: ActivityLevel | null;
}

// Fallbacks for users who onboarded before age/height/sex/activity_level existed.
const DEFAULT_AGE = 30;
const DEFAULT_HEIGHT_CM = 175;
const DEFAULT_SEX: Sex = "other";
const DEFAULT_ACTIVITY_LEVEL: ActivityLevel = "moderate";

export interface CheckinInput {
  weightKg: number;
  bodyFatPct: number | null;
  otherMetrics?: Record<string, number> | null;
  mealStyle?: string | null;
}

export async function completeCheckin(userId: string, input: CheckinInput): Promise<string[]> {
  const [userResult, previousMetrics] = await Promise.all([
    pool.query<UserRow>(
      "SELECT target_weight_kg, cuisine_preference, dietary_restrictions, grocery_store, age, height_cm, sex, activity_level FROM users WHERE id = $1",
      [userId],
    ),
    pool.query<{ weight: string }>(
      "SELECT weight FROM metrics WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1",
      [userId],
    ),
  ]);
  const user = userResult.rows[0];
  const targetWeightKg = user.target_weight_kg ? Number(user.target_weight_kg) : null;

  const targets = calculateTargets({
    weightKg: input.weightKg,
    targetWeightKg,
    timelineWeeks: null,
    age: user.age ?? DEFAULT_AGE,
    heightCm: user.height_cm ? Number(user.height_cm) : DEFAULT_HEIGHT_CM,
    sex: user.sex ?? DEFAULT_SEX,
    activityLevel: user.activity_level ?? DEFAULT_ACTIVITY_LEVEL,
  });

  const metricsResult = await pool.query<{ id: string }>(
    "INSERT INTO metrics (user_id, weight, body_fat_pct, other_metrics) VALUES ($1, $2, $3, $4) RETURNING id",
    [
      userId,
      input.weightKg,
      input.bodyFatPct,
      input.otherMetrics ? JSON.stringify(input.otherMetrics) : null,
    ],
  );
  const metricsId = metricsResult.rows[0].id;

  const targetsResult = await pool.query<{ id: string }>(
    "INSERT INTO targets (user_id, metrics_id, goal_type, calorie_target, protein_target_g, effective_from) VALUES ($1, $2, $3, $4, $5, now()) RETURNING id",
    [userId, metricsId, targets.goalType, targets.calorieTarget, targets.proteinTargetG],
  );
  const targetsId = targetsResult.rows[0].id;

  const mealPlan = await generateMealPlan({
    calorieTarget: targets.calorieTarget,
    proteinTargetG: targets.proteinTargetG,
    cuisinePreference: user.cuisine_preference,
    dietaryRestrictions: user.dietary_restrictions,
    mealStyle: input.mealStyle ?? null,
    groceryStore: user.grocery_store,
  });

  await pool.query(
    "INSERT INTO meal_plans (user_id, targets_id, recipes, shopping_list, week_of) VALUES ($1, $2, $3, $4, CURRENT_DATE)",
    [userId, targetsId, JSON.stringify(mealPlan.recipes), JSON.stringify(mealPlan.shoppingList)],
  );

  await clearFlow(userId);

  const previousWeight = previousMetrics.rows[0] ? Number(previousMetrics.rows[0].weight) : null;
  const trendLine =
    previousWeight !== null
      ? `You're at ${input.weightKg}kg, ${
          input.weightKg < previousWeight
            ? `down ${(previousWeight - input.weightKg).toFixed(1)}kg`
            : input.weightKg > previousWeight
              ? `up ${(input.weightKg - previousWeight).toFixed(1)}kg`
              : "unchanged"
        } from last check-in.`
      : `Logged your first weekly check-in at ${input.weightKg}kg.`;

  const extraMetricsLine =
    input.otherMetrics && Object.keys(input.otherMetrics).length > 0
      ? `\nAlso noted: ${Object.entries(input.otherMetrics)
          .map(([key, value]) => `${key} ${value}`)
          .join(", ")}`
      : "";

  return [
    `**This week's check-in:** ${trendLine}\nGoal: ${targets.goalType.replace("_", " ")} — ${targets.calorieTarget} kcal/day, ${targets.proteinTargetG}g protein/day.${extraMetricsLine}`,
    ...formatRecipeMessages(mealPlan),
    `**Shopping list (${user.grocery_store}):**\n\n${formatShoppingListMessage(mealPlan)}`,
  ];
}
