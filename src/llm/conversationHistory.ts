import { pool } from "../db/pool.js";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function getRecentMessages(
  userId: string,
  limit = 10,
): Promise<ConversationMessage[]> {
  const result = await pool.query<ConversationMessage>(
    "SELECT role, content FROM conversation_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [userId, limit],
  );
  return result.rows.reverse();
}

export async function recordMessage(
  userId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  await pool.query(
    "INSERT INTO conversation_messages (user_id, role, content) VALUES ($1, $2, $3)",
    [userId, role, content],
  );
}
