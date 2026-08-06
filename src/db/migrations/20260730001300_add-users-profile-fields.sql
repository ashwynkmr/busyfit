-- Up Migration

ALTER TABLE users
  ADD COLUMN age int,
  ADD COLUMN height_cm numeric,
  ADD COLUMN sex text,
  ADD COLUMN activity_level text,
  ADD COLUMN injury_notes text;

-- Down Migration

ALTER TABLE users
  DROP COLUMN age,
  DROP COLUMN height_cm,
  DROP COLUMN sex,
  DROP COLUMN activity_level,
  DROP COLUMN injury_notes;
