-- Up Migration

CREATE TABLE workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  split_id uuid REFERENCES workout_splits(id),
  exercise text NOT NULL,
  sets_reps_weight jsonb NOT NULL,
  logged_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX workout_logs_user_id_idx ON workout_logs(user_id);

-- Down Migration

DROP TABLE workout_logs;
