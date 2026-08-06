import { pool } from "../db/pool.js";

export async function ensureUser(telegramChatId: string): Promise<string> {
  const existing = await pool.query<{ id: string }>(
    "SELECT id FROM users WHERE telegram_chat_id = $1",
    [telegramChatId],
  );
  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const inserted = await pool.query<{ id: string }>(
    "INSERT INTO users (telegram_chat_id) VALUES ($1) RETURNING id",
    [telegramChatId],
  );
  return inserted.rows[0].id;
}
