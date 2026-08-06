import { CHECKIN_STEPS } from "./checkinSteps.js";
import { startFlow, advanceFlow } from "../flows/stepFlow.js";
import { completeCheckin } from "./completeCheckin.js";

interface CheckinAnswers {
  weight_kg: number;
  body_fat_pct: number | null;
  meal_style: string;
}

export async function startCheckin(userId: string): Promise<string> {
  return startFlow(userId, "checkin", CHECKIN_STEPS);
}

export async function handleCheckinAnswer(userId: string, text: string): Promise<string[]> {
  return advanceFlow<CheckinAnswers>(userId, text, CHECKIN_STEPS, (answers) =>
    completeCheckin(userId, {
      weightKg: answers.weight_kg,
      bodyFatPct: answers.body_fat_pct,
      mealStyle: answers.meal_style,
    }),
  );
}
