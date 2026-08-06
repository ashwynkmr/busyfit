-- Up Migration

ALTER TABLE users
  ADD COLUMN active_flow text,
  ADD COLUMN flow_step text,
  ADD COLUMN flow_answers jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Down Migration

ALTER TABLE users
  DROP COLUMN active_flow,
  DROP COLUMN flow_step,
  DROP COLUMN flow_answers;
