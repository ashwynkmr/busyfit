import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  databaseUrl: requireEnv("DATABASE_URL"),
  anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),
  healthWebhookSecret: requireEnv("HEALTH_WEBHOOK_SECRET"),
  port: Number(process.env.PORT ?? 3000),
};
