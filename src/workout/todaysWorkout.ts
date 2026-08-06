import { pool } from "../db/pool.js";
import { getActiveSplit } from "./getActiveSplit.js";
import { getLastLogForExercise } from "./recentLogs.js";
import { shortenSession } from "../llm/shortenSession.js";

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

async function getUserTimezone(userId: string): Promise<string> {
  const result = await pool.query<{ timezone: string | null }>(
    "SELECT timezone FROM users WHERE id = $1",
    [userId],
  );
  return result.rows[0]?.timezone ?? "UTC";
}

function todayNameInTimezone(timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" });
  return formatter.format(new Date()).toLowerCase();
}

const TIME_LIMIT_PATTERN = /(\d+)\s*(?:min|minute)/i;

export async function describeTodaysWorkout(
  userId: string,
  requestText: string,
): Promise<string> {
  const activeSplit = await getActiveSplit(userId);
  if (!activeSplit) {
    return "You don't have a workout split yet — send /onboarding to set one up first.";
  }

  const timezone = await getUserTimezone(userId);
  const dayName = todayNameInTimezone(timezone);
  const day = activeSplit.days[dayName];

  if (!day || DAY_NAMES.indexOf(dayName) === -1) {
    return `I couldn't find ${dayName} in your current split — try a split adjustment if that looks wrong.`;
  }

  if (day.type === "rest" || day.exercises.length === 0) {
    return `Today (${dayName}) is a rest day on your current split.`;
  }

  const timeLimitMatch = requestText.match(TIME_LIMIT_PATTERN);
  const minutesAvailable = timeLimitMatch ? Number(timeLimitMatch[1]) : null;

  const exercises = minutesAvailable
    ? await shortenSession({ exercises: day.exercises, minutesAvailable })
    : day.exercises;

  const lines = await Promise.all(
    exercises.map(async (exercise) => {
      const lastLog = await getLastLogForExercise(userId, exercise.name);
      const trend = lastLog
        ? ` (last: ${lastLog.sets}x${lastLog.reps}@${lastLog.weight}kg on ${lastLog.loggedAt.toDateString()})`
        : "";
      return `- ${exercise.name}: ${exercise.sets}x${exercise.reps}${trend}`;
    }),
  );

  const header = minutesAvailable
    ? `**Today's workout (${dayName}, shortened to ~${minutesAvailable} min):**`
    : `**Today's workout (${dayName}):**`;

  return `${header}\n${lines.join("\n")}`;
}
