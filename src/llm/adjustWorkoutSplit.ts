import { anthropic, MODEL_COACH } from "./client.js";
import type { WorkoutDays } from "./generateWorkoutSplit.js";

const ADJUST_SPLIT_TOOL = {
  name: "adjust_split",
  description: "Produce an updated 7-day workout split and a brief reason for the change.",
  input_schema: {
    type: "object" as const,
    properties: {
      reason: {
        type: "string" as const,
        description: "One or two sentences explaining why the split changed this way.",
      },
      days: {
        type: "array" as const,
        description: "Exactly 7 entries, one per day of the week starting Monday.",
        items: {
          type: "object" as const,
          properties: {
            day: {
              type: "string" as const,
              enum: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ],
            },
            type: { type: "string" as const, enum: ["lift", "cardio", "rest"] },
            exercises: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  name: { type: "string" as const },
                  sets: { type: "number" as const },
                  reps: { type: "string" as const, description: "e.g. '8-12' or '20 min'" },
                },
                required: ["name", "sets", "reps"],
              },
            },
          },
          required: ["day", "type", "exercises"],
        },
      },
    },
    required: ["reason", "days"],
  },
};

export interface AdjustSplitInput {
  currentDays: WorkoutDays;
  recentLogsSummary: string;
  requestOrTrigger: string;
}

export interface AdjustSplitResult {
  days: WorkoutDays;
  reason: string;
}

export async function adjustWorkoutSplit(input: AdjustSplitInput): Promise<AdjustSplitResult> {
  const prompt =
    "The client's current 7-day workout split is:\n" +
    JSON.stringify(input.currentDays) +
    "\n\nRecent logged performance:\n" +
    (input.recentLogsSummary || "No recent logs.") +
    "\n\nReason for revisiting the split: " +
    input.requestOrTrigger +
    "\n\nEvaluate the request against the current split and recent progress, then produce an " +
    "updated 7-day split. Keep what's working — only change what the request or progress data " +
    "justifies. Rest days have an empty exercises array.";

  const response = await anthropic.messages.create({
    model: MODEL_COACH,
    max_tokens: 2048,
    tools: [ADJUST_SPLIT_TOOL],
    tool_choice: { type: "tool", name: "adjust_split" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return an adjusted split");
  }

  const { reason, days } = toolUse.input as {
    reason: string;
    days: { day: string; type: WorkoutDays[string]["type"]; exercises: WorkoutDays[string]["exercises"] }[];
  };

  if (!days || days.length === 0) {
    throw new Error("Claude returned an empty split");
  }

  const result: WorkoutDays = {};
  for (const entry of days) {
    result[entry.day] = { type: entry.type, exercises: entry.exercises };
  }
  return { days: result, reason };
}
