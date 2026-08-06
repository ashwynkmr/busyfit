import { pool } from "../db/pool.js";
import type { WatchMetricRow } from "./parseHealthAutoExport.js";

export async function storeWatchMetrics(userId: string, rows: WatchMetricRow[]): Promise<void> {
  for (const row of rows) {
    await pool.query(
      "INSERT INTO watch_metrics (user_id, metric_type, value, recorded_at) VALUES ($1, $2, $3, $4)",
      [userId, row.metricType, JSON.stringify(row.value), row.recordedAt],
    );
  }
}

// Single-user MVP (see 05-backend-schema.md "Auth"): the webhook has no per-request identity
// of its own, so it's attributed to the sole onboarded user.
export async function getSingleUserId(): Promise<string | null> {
  const result = await pool.query<{ id: string }>(
    "SELECT id FROM users ORDER BY created_at ASC LIMIT 1",
  );
  return result.rows[0]?.id ?? null;
}
