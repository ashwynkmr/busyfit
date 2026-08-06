-- Up Migration

CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  targets_id uuid NOT NULL REFERENCES targets(id),
  recipes jsonb NOT NULL,
  shopping_list jsonb NOT NULL,
  week_of date NOT NULL
);

CREATE INDEX meal_plans_user_id_idx ON meal_plans(user_id);

-- Down Migration

DROP TABLE meal_plans;
