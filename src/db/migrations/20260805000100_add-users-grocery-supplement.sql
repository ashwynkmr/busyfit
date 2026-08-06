-- Up Migration

ALTER TABLE users
  ADD COLUMN grocery_store text NOT NULL DEFAULT 'HEB',
  ADD COLUMN supplement_guidance text;

-- Down Migration

ALTER TABLE users
  DROP COLUMN grocery_store,
  DROP COLUMN supplement_guidance;
