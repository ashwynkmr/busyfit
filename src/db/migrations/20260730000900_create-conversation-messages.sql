-- Up Migration

CREATE TABLE conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id),
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX conversation_messages_user_id_created_at_idx
  ON conversation_messages (user_id, created_at);

-- Down Migration

DROP TABLE conversation_messages;
