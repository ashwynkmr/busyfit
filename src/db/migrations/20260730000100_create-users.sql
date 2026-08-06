-- Up Migration

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id text NOT NULL UNIQUE,
  timezone text,
  cuisine_preference text,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE users;
