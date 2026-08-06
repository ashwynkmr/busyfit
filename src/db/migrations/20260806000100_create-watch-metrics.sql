-- Up Migration

CREATE TABLE watch_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  metric_type text NOT NULL,
  value jsonb NOT NULL,
  recorded_at timestamp NOT NULL
);

CREATE INDEX watch_metrics_user_id_idx ON watch_metrics(user_id);
CREATE INDEX watch_metrics_user_id_metric_type_recorded_at_idx
  ON watch_metrics(user_id, metric_type, recorded_at DESC);

-- Down Migration

DROP TABLE watch_metrics;
