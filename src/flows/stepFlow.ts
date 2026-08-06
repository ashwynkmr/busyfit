import { pool } from "../db/pool.js";
import type { OnboardingStep } from "../onboarding/steps.js";

export async function startFlow(
  userId: string,
  flowName: string,
  steps: OnboardingStep[],
): Promise<string> {
  await pool.query(
    "UPDATE users SET active_flow = $2, flow_step = $3, flow_answers = '{}' WHERE id = $1",
    [userId, flowName, steps[0].key],
  );
  return steps[0].prompt;
}

export async function advanceFlow<TAnswers>(
  userId: string,
  text: string,
  steps: OnboardingStep[],
  onComplete: (answers: TAnswers) => Promise<string[]>,
): Promise<string[]> {
  const userResult = await pool.query<{ flow_step: string; flow_answers: Record<string, unknown> }>(
    "SELECT flow_step, flow_answers FROM users WHERE id = $1",
    [userId],
  );
  const user = userResult.rows[0];
  if (!user || !user.flow_step) {
    return ["Something went wrong — that flow isn't active anymore."];
  }

  const stepIndex = steps.findIndex((step) => step.key === user.flow_step);
  const step = steps[stepIndex];
  const result = step.parse(text);

  if (!result.ok) {
    return [result.error ?? "Couldn't parse that — try again.", step.prompt];
  }

  const answers = { ...user.flow_answers, [step.key]: result.value };

  const nextStep = steps[stepIndex + 1];
  if (nextStep) {
    await pool.query("UPDATE users SET flow_step = $2, flow_answers = $3 WHERE id = $1", [
      userId,
      nextStep.key,
      JSON.stringify(answers),
    ]);
    return [nextStep.prompt];
  }

  return onComplete(answers as TAnswers);
}

export async function clearFlow(userId: string): Promise<void> {
  await pool.query(
    "UPDATE users SET active_flow = NULL, flow_step = NULL, flow_answers = '{}' WHERE id = $1",
    [userId],
  );
}
