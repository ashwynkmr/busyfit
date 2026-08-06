-- Up Migration

ALTER TABLE users
  ADD COLUMN target_weight_kg numeric;

-- Down Migration

ALTER TABLE users
  DROP COLUMN target_weight_kg;
