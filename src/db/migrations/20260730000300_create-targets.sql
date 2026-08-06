-- Up Migration

CREATE TABLE targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  metrics_id uuid NOT NULL REFERENCES metrics(id),
  goal_type text NOT NULL,
  calorie_target int NOT NULL,
  protein_target_g int NOT NULL,
  effective_from timestamp NOT NULL DEFAULT now()
);

CREATE INDEX targets_user_id_idx ON targets(user_id);

-- Down Migration

DROP TABLE targets;
