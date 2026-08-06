import cron from "node-cron";
import type { Bot } from "grammy";
import { pool } from "../db/pool.js";
import { startCheckin } from "../checkin/checkinFlow.js";

interface CheckinUserRow {
  id: string;
  telegram_chat_id: string;
  timezone: string | null;
}

const SATURDAY_9AM = "0 9 * * 6";

export async function scheduleSaturdayCheckins(bot: Bot): Promise<void> {
  const result = await pool.query<CheckinUserRow>(
    "SELECT u.id, u.telegram_chat_id, u.timezone FROM users u " +
      "WHERE EXISTS (SELECT 1 FROM metrics m WHERE m.user_id = u.id)",
  );

  for (const user of result.rows) {
    cron.schedule(
      SATURDAY_9AM,
      async () => {
        try {
          const prompt = await startCheckin(user.id);
          await bot.api.sendMessage(user.telegram_chat_id, prompt);
        } catch (err) {
          console.error(`Saturday check-in failed for user ${user.id}:`, err);
        }
      },
      { timezone: user.timezone ?? "UTC" },
    );
  }

  console.log(`Scheduled Saturday check-ins for ${result.rows.length} user(s)`);
}
