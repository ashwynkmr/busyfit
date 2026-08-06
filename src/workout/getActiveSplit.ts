import { pool } from "../db/pool.js";
import type { WorkoutDays } from "../llm/generateWorkoutSplit.js";

export interface ActiveSplit {
  id: string;
  version: number;
  days: WorkoutDays;
}

export async function getActiveSplit(userId: string): Promise<ActiveSplit | null> {
  const result = await pool.query<{ id: string; version: number; days: WorkoutDays }>(
    "SELECT id, version, days FROM workout_splits WHERE user_id = $1 ORDER BY active_from DESC LIMIT 1",
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function saveNewSplitVersion(
  userId: string,
  days: WorkoutDays,
  reasonForChange: string,
): Promise<number> {
  const current = await pool.query<{ version: number }>(
    "SELECT version FROM workout_splits WHERE user_id = $1 ORDER BY active_from DESC LIMIT 1",
    [userId],
  );
  const nextVersion = (current.rows[0]?.version ?? 0) + 1;

  await pool.query(
    "INSERT INTO workout_splits (user_id, version, days, reason_for_change, active_from) VALUES ($1, $2, $3, $4, now())",
    [userId, nextVersion, JSON.stringify(days), reasonForChange],
  );

  return nextVersion;
}
