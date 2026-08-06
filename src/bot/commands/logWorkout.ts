import type { CommandContext, Context } from "grammy";
import { pool } from "../../db/pool.js";
import { ensureUser } from "../ensureUser.js";

// /logworkout <exercise> | <sets>x<reps>@<weight>
// Example: /logworkout bench press | 3x8@60
export async function logWorkout(ctx: CommandContext<Context>): Promise<void> {
  const chatId = ctx.chat.id.toString();
  const raw = ctx.match?.toString().trim();

  if (!raw) {
    await ctx.reply(
      "Usage: /logworkout <exercise> | <sets>x<reps>@<weight>\n" +
        "Example: /logworkout bench press | 3x8@60",
    );
    return;
  }

  const parts = raw.split("|").map((part) => part.trim());
  const [exercise, setsRepsWeightRaw] = parts;

  const match = setsRepsWeightRaw?.match(/^(\d+)x(\d+)@(\d+(?:\.\d+)?)$/i);
  if (!exercise || !match) {
    await ctx.reply(
      "Couldn't parse that. Usage: /logworkout <exercise> | <sets>x<reps>@<weight>",
    );
    return;
  }

  const [, sets, reps, weight] = match;
  const setsRepsWeight = { sets: Number(sets), reps: Number(reps), weight: Number(weight) };

  const userId = await ensureUser(chatId);
  await pool.query(
    "INSERT INTO workout_logs (user_id, exercise, sets_reps_weight) VALUES ($1, $2, $3)",
    [userId, exercise, setsRepsWeight],
  );

  await ctx.reply(`Logged: ${exercise} — ${sets}x${reps}@${weight}`);
}
