-- Up Migration

CREATE TABLE metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  weight numeric NOT NULL,
  body_fat_pct numeric,
  other_metrics jsonb,
  recorded_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX metrics_user_id_idx ON metrics(user_id);

-- Down Migration

DROP TABLE metrics;
