-- Up Migration

CREATE TABLE watch_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  metric_type text NOT NULL,
  value jsonb NOT NULL,
  recorded_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX watch_metrics_user_id_idx ON watch_metrics(user_id);

-- Down Migration

DROP TABLE watch_metrics;
