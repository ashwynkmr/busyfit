-- Up Migration

CREATE TABLE workout_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  version int NOT NULL,
  days jsonb NOT NULL,
  reason_for_change text,
  active_from timestamp NOT NULL DEFAULT now()
);

CREATE INDEX workout_splits_user_id_idx ON workout_splits(user_id);

-- Down Migration

DROP TABLE workout_splits;
