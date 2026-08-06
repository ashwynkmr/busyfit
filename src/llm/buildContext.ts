import { pool } from "../db/pool.js";

interface MetricsRow {
  weight: string;
  body_fat_pct: string | null;
  recorded_at: Date;
}

interface TargetsRow {
  goal_type: string;
  calorie_target: number;
  protein_target_g: number;
  effective_from: Date;
}

interface WorkoutSplitRow {
  version: number;
  days: unknown;
  reason_for_change: string | null;
  active_from: Date;
}

interface SupplementRow {
  supplement_guidance: string | null;
}

export async function buildUserContext(userId: string): Promise<string> {
  const [metrics, targets, split, supplements] = await Promise.all([
    pool.query<MetricsRow>(
      "SELECT weight, body_fat_pct, recorded_at FROM metrics WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1",
      [userId],
    ),
    pool.query<TargetsRow>(
      "SELECT goal_type, calorie_target, protein_target_g, effective_from FROM targets WHERE user_id = $1 ORDER BY effective_from DESC LIMIT 1",
      [userId],
    ),
    pool.query<WorkoutSplitRow>(
      "SELECT version, days, reason_for_change, active_from FROM workout_splits WHERE user_id = $1 ORDER BY active_from DESC LIMIT 1",
      [userId],
    ),
    pool.query<SupplementRow>("SELECT supplement_guidance FROM users WHERE id = $1", [userId]),
  ]);

  const lines: string[] = [];

  const latestMetrics = metrics.rows[0];
  if (latestMetrics) {
    const bodyFat = latestMetrics.body_fat_pct ? `, ${latestMetrics.body_fat_pct}% body fat` : "";
    lines.push(
      `Latest check-in: ${latestMetrics.weight}kg${bodyFat} (${latestMetrics.recorded_at.toDateString()})`,
    );
  } else {
    lines.push("No metrics check-in on file yet.");
  }

  const activeTargets = targets.rows[0];
  if (activeTargets) {
    lines.push(
      `Current goal: ${activeTargets.goal_type} — ${activeTargets.calorie_target} kcal/day, ${activeTargets.protein_target_g}g protein/day (effective ${activeTargets.effective_from.toDateString()})`,
    );
  } else {
    lines.push("No targets set yet.");
  }

  const activeSplit = split.rows[0];
  if (activeSplit) {
    lines.push(
      `Active workout split (v${activeSplit.version}): ${JSON.stringify(activeSplit.days)}${
        activeSplit.reason_for_change ? ` — changed because: ${activeSplit.reason_for_change}` : ""
      }`,
    );
  } else {
    lines.push("No workout split set yet.");
  }

  const supplementGuidance = supplements.rows[0]?.supplement_guidance;
  if (supplementGuidance) {
    lines.push(`General supplement guidance given at onboarding: ${supplementGuidance}`);
  }

  return lines.join("\n");
}
