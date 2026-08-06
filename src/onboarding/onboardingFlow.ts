import { pool } from "../db/pool.js";
import { getOnboardingSteps } from "./steps.js";
import { calculateTargets } from "./deficitCalculator.js";
import type { ActivityLevel, Sex } from "./deficitCalculator.js";
import { generateWorkoutSplit } from "../llm/generateWorkoutSplit.js";
import { generateSupplementGuidance } from "../llm/generateSupplementGuidance.js";
import { startFlow, advanceFlow, clearFlow } from "../flows/stepFlow.js";
import { formatSplitSummary } from "../flows/formatSplit.js";
import { getUserProfile } from "../bot/userState.js";

interface OnboardingAnswers {
  weight_kg: number;
  age?: number;
  height_cm?: number;
  sex?: Sex;
  activity_level?: ActivityLevel;
  body_fat_pct: number | null;
  target_weight_kg: number | null;
  timeline_weeks: number;
  training_experience: string;
  dietary_restrictions?: string | null;
  cuisine_preference?: string | null;
  injury_notes?: string | null;
}

export async function startOnboarding(userId: string): Promise<string> {
  const existingProfile = await getUserProfile(userId);
  const steps = getOnboardingSteps(existingProfile);
  return startFlow(userId, "onboarding", steps);
}

export async function handleOnboardingAnswer(userId: string, text: string): Promise<string[]> {
  const existingProfile = await getUserProfile(userId);
  const steps = getOnboardingSteps(existingProfile);
  return advanceFlow<OnboardingAnswers>(userId, text, steps, (answers) =>
    finishOnboarding(userId, answers, existingProfile),
  );
}

async function finishOnboarding(
  userId: string,
  answers: OnboardingAnswers,
  existingProfile: Awaited<ReturnType<typeof getUserProfile>>,
): Promise<string[]> {
  const age = answers.age ?? existingProfile.age;
  const heightCm = answers.height_cm ?? (existingProfile.height_cm ? Number(existingProfile.height_cm) : null);
  const sex = (answers.sex ?? existingProfile.sex) as Sex | null;
  const activityLevel = (answers.activity_level ?? existingProfile.activity_level) as ActivityLevel | null;
  const dietaryRestrictions = answers.dietary_restrictions ?? existingProfile.dietary_restrictions ?? null;
  const cuisinePreference = answers.cuisine_preference ?? existingProfile.cuisine_preference ?? null;
  const injuryNotes = answers.injury_notes ?? existingProfile.injury_notes ?? null;

  if (age === null || heightCm === null || !sex || !activityLevel) {
    return [
      "Something went wrong — missing profile info. Send /onboarding to start again.",
    ];
  }

  const targets = calculateTargets({
    weightKg: answers.weight_kg,
    targetWeightKg: answers.target_weight_kg,
    timelineWeeks: answers.timeline_weeks,
    age,
    heightCm,
    sex,
    activityLevel,
  });

  const metricsResult = await pool.query<{ id: string }>(
    "INSERT INTO metrics (user_id, weight, body_fat_pct) VALUES ($1, $2, $3) RETURNING id",
    [userId, answers.weight_kg, answers.body_fat_pct],
  );
  const metricsId = metricsResult.rows[0].id;

  await pool.query(
    "INSERT INTO targets (user_id, metrics_id, goal_type, calorie_target, protein_target_g, effective_from) VALUES ($1, $2, $3, $4, $5, now())",
    [userId, metricsId, targets.goalType, targets.calorieTarget, targets.proteinTargetG],
  );

  const [days, supplementGuidance] = await Promise.all([
    generateWorkoutSplit({
      goalType: targets.goalType,
      trainingExperience: answers.training_experience,
      injuryNotes,
    }),
    generateSupplementGuidance({ age, sex, dietaryRestrictions, cuisinePreference }),
  ]);

  await pool.query(
    "INSERT INTO workout_splits (user_id, version, days, reason_for_change, active_from) VALUES ($1, 1, $2, 'initial onboarding', now())",
    [userId, JSON.stringify(days)],
  );

  await pool.query(
    "UPDATE users SET cuisine_preference = $2, target_weight_kg = $3, dietary_restrictions = $4, " +
      "age = $5, height_cm = $6, sex = $7, activity_level = $8, injury_notes = $9, supplement_guidance = $10 WHERE id = $1",
    [
      userId,
      cuisinePreference,
      answers.target_weight_kg,
      dietaryRestrictions,
      age,
      heightCm,
      sex,
      activityLevel,
      injuryNotes,
      supplementGuidance,
    ],
  );
  await clearFlow(userId);

  return [
    `**You're set up.** Goal: ${targets.goalType.replace("_", " ")} — ${targets.calorieTarget} kcal/day, ${targets.proteinTargetG}g protein/day.`,
    `**Your starting split:**\n${formatSplitSummary(days)}`,
    `**A few general supplement notes:** ${supplementGuidance}`,
    "Log meals with /logmeal and workouts with /logworkout, or just ask me anything.",
  ];
}
