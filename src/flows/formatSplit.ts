import type { WorkoutDays } from "../llm/generateWorkoutSplit.js";

export function formatSplitSummary(days: WorkoutDays): string {
  return Object.entries(days)
    .map(
      ([day, info]) =>
        `- ${day}: ${info.type}${
          info.exercises.length ? ` (${info.exercises.map((e) => e.name).join(", ")})` : ""
        }`,
    )
    .join("\n");
}
