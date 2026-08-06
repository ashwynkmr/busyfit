import type { CommandContext, Context } from "grammy";
import { pool } from "../../db/pool.js";
import { ensureUser } from "../ensureUser.js";

// /logmeal <description> | <calories> | <protein> <carbs> <fat>
// macros segment is optional
export async function logMeal(ctx: CommandContext<Context>): Promise<void> {
  const chatId = ctx.chat.id.toString();
  const raw = ctx.match?.toString().trim();

  if (!raw) {
    await ctx.reply(
      "Usage: /logmeal <description> | <calories> | <protein> <carbs> <fat>\n" +
        "Example: /logmeal chicken and rice | 650 | 45 60 15",
    );
    return;
  }

  const parts = raw.split("|").map((part) => part.trim());
  const [description, caloriesRaw, macrosRaw] = parts;

  const calories = Number(caloriesRaw);
  if (!description || !Number.isFinite(calories)) {
    await ctx.reply(
      "Couldn't parse that. Usage: /logmeal <description> | <calories> | <protein> <carbs> <fat>",
    );
    return;
  }

  let macros: { protein: number; carbs: number; fat: number } | null = null;
  if (macrosRaw) {
    const [protein, carbs, fat] = macrosRaw.split(/\s+/).map(Number);
    if ([protein, carbs, fat].every(Number.isFinite)) {
      macros = { protein, carbs, fat };
    }
  }

  const userId = await ensureUser(chatId);
  await pool.query(
    "INSERT INTO meals (user_id, description, calories, macros) VALUES ($1, $2, $3, $4)",
    [userId, description, calories, macros],
  );

  await ctx.reply(`Logged: ${description} — ${calories} kcal${macros ? ` (P${macros.protein}/C${macros.carbs}/F${macros.fat})` : ""}`);
}
