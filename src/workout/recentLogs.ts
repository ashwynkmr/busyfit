import { pool } from "../db/pool.js";

interface SetsRepsWeight {
  sets: number;
  reps: number;
  weight: number;
}

interface WorkoutLogRow {
  exercise: string;
  sets_reps_weight: SetsRepsWeight;
  logged_at: Date;
}

export async function getRecentLogsSummary(userId: string, limit = 20): Promise<string> {
  const result = await pool.query<WorkoutLogRow>(
    "SELECT exercise, sets_reps_weight, logged_at FROM workout_logs WHERE user_id = $1 " +
      "ORDER BY logged_at DESC LIMIT $2",
    [userId, limit],
  );

  if (result.rows.length === 0) {
    return "";
  }

  return result.rows
    .map((row) => {
      const { sets, reps, weight } = row.sets_reps_weight;
      return `${row.logged_at.toDateString()}: ${row.exercise} — ${sets}x${reps}@${weight}kg`;
    })
    .join("\n");
}

export async function getLastLogForExercise(
  userId: string,
  exercise: string,
): Promise<{ sets: number; reps: number; weight: number; loggedAt: Date } | null> {
  const result = await pool.query<WorkoutLogRow>(
    "SELECT exercise, sets_reps_weight, logged_at FROM workout_logs " +
      "WHERE user_id = $1 AND lower(exercise) = lower($2) ORDER BY logged_at DESC LIMIT 1",
    [userId, exercise],
  );

  const row = result.rows[0];
  if (!row) return null;

  return { ...row.sets_reps_weight, loggedAt: row.logged_at };
}
