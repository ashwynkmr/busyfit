import { pool } from "./db/pool.js";
import { bot } from "./bot/index.js";
import { scheduleSaturdayCheckins } from "./scheduler/saturdayCheckin.js";

async function main(): Promise<void> {
  await pool.query("SELECT 1");
  console.log("Connected to Postgres");

  await scheduleSaturdayCheckins(bot);

  await bot.start();
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
