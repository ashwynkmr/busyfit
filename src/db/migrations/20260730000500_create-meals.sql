-- Up Migration

CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  description text NOT NULL,
  calories int NOT NULL,
  macros jsonb,
  logged_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX meals_user_id_idx ON meals(user_id);

-- Down Migration

DROP TABLE meals;
