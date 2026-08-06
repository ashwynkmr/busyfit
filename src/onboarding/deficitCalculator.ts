export type GoalType = "fat_loss" | "muscle_gain" | "recomp" | "maintenance";
export type Sex = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export interface DeficitInput {
  weightKg: number;
  targetWeightKg: number | null;
  timelineWeeks: number | null;
  age: number;
  heightCm: number;
  sex: Sex;
  activityLevel: ActivityLevel;
}

export interface DeficitResult {
  goalType: GoalType;
  calorieTarget: number;
  proteinTargetG: number;
}

const FAT_LOSS_DEFICIT = 500;
const MUSCLE_GAIN_SURPLUS = 250;
const RECOMP_DEFICIT = 200;

const PROTEIN_PER_KG_LEAN_FOCUS = 2.2; // fat_loss / recomp — preserve muscle in a deficit
const PROTEIN_PER_KG_STANDARD = 1.8; // muscle_gain / maintenance

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Mifflin-St Jeor BMR. The "other" sex offset splits the difference between the
// male (+5) and female (-161) constants — there's no clinically standard formula
// for non-binary sex, so this is a reasonable midpoint rather than a precise value.
function calculateBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  switch (sex) {
    case "male":
      return base + 5;
    case "female":
      return base - 161;
    case "other":
      return base - 78;
  }
}

export function deriveGoalType(input: DeficitInput): GoalType {
  const { weightKg, targetWeightKg } = input;
  if (targetWeightKg === null) {
    return "maintenance";
  }

  const deltaKg = targetWeightKg - weightKg;
  if (deltaKg <= -1) {
    return "fat_loss";
  }
  if (deltaKg >= 1) {
    return "muscle_gain";
  }
  return "recomp";
}

export function calculateTargets(input: DeficitInput): DeficitResult {
  const goalType = deriveGoalType(input);
  const bmr = calculateBmr(input.weightKg, input.heightCm, input.age, input.sex);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activityLevel];

  let calorieTarget: number;
  switch (goalType) {
    case "fat_loss":
      calorieTarget = tdee - FAT_LOSS_DEFICIT;
      break;
    case "muscle_gain":
      calorieTarget = tdee + MUSCLE_GAIN_SURPLUS;
      break;
    case "recomp":
      calorieTarget = tdee - RECOMP_DEFICIT;
      break;
    case "maintenance":
      calorieTarget = tdee;
      break;
  }

  const proteinPerKg =
    goalType === "fat_loss" || goalType === "recomp"
      ? PROTEIN_PER_KG_LEAN_FOCUS
      : PROTEIN_PER_KG_STANDARD;

  return {
    goalType,
    calorieTarget: Math.round(calorieTarget),
    proteinTargetG: Math.round(input.weightKg * proteinPerKg),
  };
}
