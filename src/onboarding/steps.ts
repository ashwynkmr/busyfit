import { parseWeightKg, parseHeightCm } from "./units.js";

export interface StepResult {
  ok: boolean;
  value?: unknown;
  error?: string;
}

export interface OnboardingStep {
  key: string;
  prompt: string;
  parse: (raw: string) => StepResult;
}

function parseNumber(raw: string): number | null {
  const value = Number(raw.trim());
  return Number.isFinite(value) ? value : null;
}

function isSkip(raw: string): boolean {
  return ["skip", "none", "n/a", "na", "don't know", "dont know"].includes(
    raw.trim().toLowerCase(),
  );
}

// Fields that don't change goal to goal — skip re-asking these on a re-run of
// onboarding if already on file. Everything else (weight, body fat, target,
// timeline, training experience) defines the *new* goal, so always ask it.
export const STATIC_PROFILE_KEYS = [
  "age",
  "height_cm",
  "sex",
  "activity_level",
  "dietary_restrictions",
  "cuisine_preference",
  "injury_notes",
] as const;

export const ALL_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: "weight_kg",
    prompt: "Let's set up your plan. What's your current weight? (e.g. 70kg or 154lbs)",
    parse: (raw) => {
      const value = parseWeightKg(raw);
      if (value === null || value <= 0) {
        return {
          ok: false,
          error: "That doesn't look like a weight — reply with a number, e.g. 70kg or 154lbs.",
        };
      }
      return { ok: true, value };
    },
  },
  {
    key: "age",
    prompt: "What's your age?",
    parse: (raw) => {
      const value = parseNumber(raw);
      if (value === null || value <= 0 || value > 120) {
        return { ok: false, error: "Reply with your age in years." };
      }
      return { ok: true, value: Math.round(value) };
    },
  },
  {
    key: "height_cm",
    prompt: "What's your height? (e.g. 175cm, 5'9\", or 69in)",
    parse: (raw) => {
      const value = parseHeightCm(raw);
      if (value === null || value <= 0) {
        return {
          ok: false,
          error: "That doesn't look like a height — reply like 175cm, 5'9\", or 69in.",
        };
      }
      return { ok: true, value };
    },
  },
  {
    key: "sex",
    prompt: "What's your sex (for calorie calculations) — male, female, or other?",
    parse: (raw) => {
      const value = raw.trim().toLowerCase();
      if (!["male", "female", "other"].includes(value)) {
        return { ok: false, error: "Reply with male, female, or other." };
      }
      return { ok: true, value };
    },
  },
  {
    key: "activity_level",
    prompt:
      "How active is your day-to-day outside of training — sedentary, light, moderate, active, or very_active?",
    parse: (raw) => {
      const value = raw.trim().toLowerCase();
      if (!["sedentary", "light", "moderate", "active", "very_active"].includes(value)) {
        return {
          ok: false,
          error: "Reply with sedentary, light, moderate, active, or very_active.",
        };
      }
      return { ok: true, value };
    },
  },
  {
    key: "body_fat_pct",
    prompt: "What's your current body fat %? Reply 'skip' if you don't know.",
    parse: (raw) => {
      if (isSkip(raw)) {
        return { ok: true, value: null };
      }
      const value = parseNumber(raw);
      if (value === null || value <= 0 || value >= 100) {
        return { ok: false, error: "That doesn't look like a body fat % — reply with a number, or 'skip'." };
      }
      return { ok: true, value };
    },
  },
  {
    key: "target_weight_kg",
    prompt:
      "What's your target weight? (e.g. 65kg or 143lbs) Reply 'maintain' if you just want to maintain your current weight.",
    parse: (raw) => {
      if (raw.trim().toLowerCase() === "maintain") {
        return { ok: true, value: null };
      }
      const value = parseWeightKg(raw);
      if (value === null || value <= 0) {
        return {
          ok: false,
          error: "That doesn't look like a weight — reply like 65kg or 143lbs, or 'maintain'.",
        };
      }
      return { ok: true, value };
    },
  },
  {
    key: "timeline_weeks",
    prompt: "What's your timeline, in weeks?",
    parse: (raw) => {
      const value = parseNumber(raw);
      if (value === null || value <= 0) {
        return { ok: false, error: "Reply with a number of weeks." };
      }
      return { ok: true, value: Math.round(value) };
    },
  },
  {
    key: "training_experience",
    prompt: "What's your training experience — beginner, intermediate, or advanced?",
    parse: (raw) => {
      const value = raw.trim().toLowerCase();
      if (!["beginner", "intermediate", "advanced"].includes(value)) {
        return { ok: false, error: "Reply with beginner, intermediate, or advanced." };
      }
      return { ok: true, value };
    },
  },
  {
    key: "dietary_restrictions",
    prompt: "Any dietary restrictions? Reply 'none' if not.",
    parse: (raw) => ({ ok: true, value: isSkip(raw) ? null : raw.trim() }),
  },
  {
    key: "cuisine_preference",
    prompt: "Any preferred cuisines? Reply 'none' if no preference.",
    parse: (raw) => ({ ok: true, value: isSkip(raw) ? null : raw.trim() }),
  },
  {
    key: "injury_notes",
    prompt: "Any injuries or physical limitations I should account for in your training? Reply 'none' if not.",
    parse: (raw) => ({ ok: true, value: isSkip(raw) ? null : raw.trim() }),
  },
];

export type ExistingProfile = Partial<Record<(typeof STATIC_PROFILE_KEYS)[number], unknown>>;

// On a re-run (goal change), skip static profile fields already on file — only
// ask what's still missing plus the goal-defining fields, which always get asked.
export function getOnboardingSteps(existingProfile: ExistingProfile): OnboardingStep[] {
  return ALL_ONBOARDING_STEPS.filter((step) => {
    if (!(STATIC_PROFILE_KEYS as readonly string[]).includes(step.key)) {
      return true;
    }
    const existingValue = existingProfile[step.key as (typeof STATIC_PROFILE_KEYS)[number]];
    return existingValue === null || existingValue === undefined;
  });
}
