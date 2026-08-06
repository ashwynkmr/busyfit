export interface WatchMetricRow {
  metricType: string;
  value: Record<string, unknown>;
  recordedAt: Date;
}

// Health Auto Export's own metric names -> our metric_type values (schema: 05-backend-schema.md)
const METRIC_TYPE_MAP: Record<string, string> = {
  step_count: "steps",
  steps: "steps",
  heart_rate: "heart_rate",
  active_energy: "active_calories",
  active_energy_burned: "active_calories",
};

interface HealthAutoExportMetric {
  name: string;
  units?: string;
  data: Record<string, unknown>[];
}

interface HealthAutoExportWorkout {
  name?: string;
  start?: string;
  end?: string;
  [key: string]: unknown;
}

interface HealthAutoExportPayload {
  data?: {
    metrics?: HealthAutoExportMetric[];
    workouts?: HealthAutoExportWorkout[];
  };
}

// Health Auto Export dates look like "2026-08-06 08:00:00 -0700" — not valid ISO 8601
// as-is (space separator, no colon in the UTC offset), so reformat before parsing.
const HEALTH_EXPORT_DATE_PATTERN =
  /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\s*([+-]\d{2}):?(\d{2}))?$/;

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== "string") return null;

  const match = raw.match(HEALTH_EXPORT_DATE_PATTERN);
  const iso = match
    ? `${match[1]}T${match[2]}${match[3] ? `${match[3]}:${match[4]}` : "Z"}`
    : raw;

  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseHealthAutoExport(payload: unknown): WatchMetricRow[] {
  const body = payload as HealthAutoExportPayload;
  const rows: WatchMetricRow[] = [];

  for (const metric of body.data?.metrics ?? []) {
    const metricType = METRIC_TYPE_MAP[metric.name] ?? metric.name;
    for (const entry of metric.data ?? []) {
      const recordedAt = parseDate(entry.date);
      if (!recordedAt) continue;
      rows.push({ metricType, value: { ...entry, units: metric.units }, recordedAt });
    }
  }

  for (const workout of body.data?.workouts ?? []) {
    const recordedAt = parseDate(workout.start) ?? parseDate(workout.end);
    if (!recordedAt) continue;
    rows.push({ metricType: "workout", value: workout, recordedAt });
  }

  return rows;
}
