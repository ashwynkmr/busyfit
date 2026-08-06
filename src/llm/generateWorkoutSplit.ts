import { anthropic, MODEL_COACH } from "./client.js";
import type { GoalType } from "../onboarding/deficitCalculator.js";

export interface WorkoutDay {
  type: "lift" | "cardio" | "rest";
  exercises: { name: string; sets: number; reps: string }[];
}

export type WorkoutDays = Record<string, WorkoutDay>;

const GENERATE_SPLIT_TOOL = {
  name: "generate_split",
  description: "Generate a 7-day workout split for the client.",
  input_schema: {
    type: "object" as const,
    properties: {
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
    required: ["days"],
  },
};

export interface GenerateSplitInput {
  goalType: GoalType;
  trainingExperience: string;
  daysPerWeekPreference?: string;
  injuryNotes?: string | null;
}

export async function generateWorkoutSplit(input: GenerateSplitInput): Promise<WorkoutDays> {
  const prompt =
    `Design a 7-day workout split for a client with goal "${input.goalType}" and ` +
    `training experience "${input.trainingExperience}". ` +
    "Default to 5-6 active days mixing lifting and cardio/abs, with the exact ratio " +
    "chosen based on the goal (not a fixed template) — e.g. more lifting for muscle_gain, " +
    "more cardio volume for fat_loss, a balanced mix for recomp/maintenance. " +
    (input.daysPerWeekPreference ? `Client preference: ${input.daysPerWeekPreference}. ` : "") +
    (input.injuryNotes
      ? `Injuries/limitations to work around — avoid or modify exercises accordingly: ${input.injuryNotes}. `
      : "") +
    "Rest days have an empty exercises array.";

  const response = await anthropic.messages.create({
    model: MODEL_COACH,
    max_tokens: 2048,
    tools: [GENERATE_SPLIT_TOOL],
    tool_choice: { type: "tool", name: "generate_split" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a workout split");
  }

  const { days } = toolUse.input as {
    days: { day: string; type: WorkoutDay["type"]; exercises: WorkoutDay["exercises"] }[];
  };

  const result: WorkoutDays = {};
  for (const entry of days) {
    result[entry.day] = { type: entry.type, exercises: entry.exercises };
  }
  return result;
}
