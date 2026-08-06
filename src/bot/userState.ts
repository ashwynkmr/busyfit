import { pool } from "../db/pool.js";

export async function getActiveFlow(userId: string): Promise<string | null> {
  const result = await pool.query<{ active_flow: string | null }>(
    "SELECT active_flow FROM users WHERE id = $1",
    [userId],
  );
  return result.rows[0]?.active_flow ?? null;
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM metrics WHERE user_id = $1) AS exists",
    [userId],
  );
  return result.rows[0]?.exists ?? false;
}

export interface UserProfileRow {
  age: number | null;
  height_cm: string | null;
  sex: string | null;
  activity_level: string | null;
  dietary_restrictions: string | null;
  cuisine_preference: string | null;
  injury_notes: string | null;
}

export async function getUserProfile(userId: string): Promise<UserProfileRow> {
  const result = await pool.query<UserProfileRow>(
    "SELECT age, height_cm, sex, activity_level, dietary_restrictions, cuisine_preference, injury_notes FROM users WHERE id = $1",
    [userId],
  );
  return (
    result.rows[0] ?? {
      age: null,
      height_cm: null,
      sex: null,
      activity_level: null,
      dietary_restrictions: null,
      cuisine_preference: null,
      injury_notes: null,
    }
  );
}
