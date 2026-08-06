-- Up Migration

ALTER TABLE users
  ADD COLUMN dietary_restrictions text;

-- Down Migration

ALTER TABLE users
  DROP COLUMN dietary_restrictions;
