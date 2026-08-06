import type { OnboardingStep } from "../onboarding/steps.js";

function parseNumber(raw: string): number | null {
  const value = Number(raw.trim());
  return Number.isFinite(value) ? value : null;
}

function isSkip(raw: string): boolean {
  return ["skip", "none", "n/a", "na", "don't know", "dont know"].includes(
    raw.trim().toLowerCase(),
  );
}

export const CHECKIN_STEPS: OnboardingStep[] = [
  {
    key: "weight_kg",
    prompt: "Time for your weekly check-in — what's your weight this week (in kg)?",
    parse: (raw) => {
      const value = parseNumber(raw);
      if (value === null || value <= 0) {
        return { ok: false, error: "That doesn't look like a weight — reply with a number in kg." };
      }
      return { ok: true, value };
    },
  },
  {
    key: "body_fat_pct",
    prompt: "And your body fat % this week? Reply 'skip' if you don't have it.",
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
    key: "meal_style",
    prompt:
      "What are you feeling this week for meal prep? A cuisine mix, a format (e.g. smoothies for breakfast), or just say 'surprise me'.",
    parse: (raw) => ({ ok: true, value: raw.trim() }),
  },
];
