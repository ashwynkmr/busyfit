import { anthropic, MODEL_ROUTER } from "./client.js";
import type { WorkoutDay } from "./generateWorkoutSplit.js";

const SHORTEN_TOOL = {
  name: "shorten_session",
  description: "Trim a workout session's exercise list to fit a shorter time budget.",
  input_schema: {
    type: "object" as const,
    properties: {
      exercises: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
            sets: { type: "number" as const },
            reps: { type: "string" as const },
          },
          required: ["name", "sets", "reps"],
        },
      },
    },
    required: ["exercises"],
  },
};

export interface ShortenSessionInput {
  exercises: WorkoutDay["exercises"];
  minutesAvailable: number;
}

export async function shortenSession(
  input: ShortenSessionInput,
): Promise<WorkoutDay["exercises"]> {
  const prompt =
    `Today's planned session is:\n${JSON.stringify(input.exercises)}\n\n` +
    `The client only has ${input.minutesAvailable} minutes. Cut this down to what fits — ` +
    "prioritize the compound/primary movements, drop or reduce accessory work, and reduce sets " +
    "if needed rather than dropping every exercise to one set.";

  const response = await anthropic.messages.create({
    model: MODEL_ROUTER,
    max_tokens: 1024,
    tools: [SHORTEN_TOOL],
    tool_choice: { type: "tool", name: "shorten_session" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return input.exercises;
  }

  const { exercises } = toolUse.input as { exercises: WorkoutDay["exercises"] };
  return exercises.length > 0 ? exercises : input.exercises;
}
