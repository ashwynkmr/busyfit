import { Bot } from "grammy";
import { config } from "../config.js";
import { ensureUser } from "./ensureUser.js";
import { getActiveFlow, hasCompletedOnboarding } from "./userState.js";
import { replyLong, replyAllLong } from "./replyLong.js";
import { logMeal } from "./commands/logMeal.js";
import { logWorkout } from "./commands/logWorkout.js";
import { classifyIntent } from "../llm/intentRouter.js";
import { answerQuestion } from "../llm/coach.js";
import { startOnboarding, handleOnboardingAnswer } from "../onboarding/onboardingFlow.js";
import { handleCheckinAnswer } from "../checkin/checkinFlow.js";
import { completeCheckin } from "../checkin/completeCheckin.js";
import { downloadTelegramFile } from "./downloadTelegramFile.js";
import { parseScalePhoto } from "../llm/parseScalePhoto.js";
import { clearFlow } from "../flows/stepFlow.js";

export const bot = new Bot(config.telegramBotToken);

bot.command("start", async (ctx) => {
  const userId = await ensureUser(ctx.chat.id.toString());
  await ctx.reply(
    "Welcome. I'm your fitness & nutrition coach.\n\n" +
      "You can log things manually:\n" +
      "/logmeal <description> | <calories> | <protein> <carbs> <fat>\n" +
      "/logworkout <exercise> | <sets>x<reps>@<weight>\n\n" +
      "Or just ask me anything.",
  );

  if (!(await hasCompletedOnboarding(userId))) {
    const prompt = await startOnboarding(userId);
    await ctx.reply(prompt);
  }
});

bot.command("onboarding", async (ctx) => {
  const userId = await ensureUser(ctx.chat.id.toString());
  const prompt = await startOnboarding(userId);
  await ctx.reply(prompt);
});

bot.command("logmeal", logMeal);
bot.command("logworkout", logWorkout);

bot.on("message:text", async (ctx) => {
  const userId = await ensureUser(ctx.chat.id.toString());
  const text = ctx.message.text;

  try {
    const activeFlow = await getActiveFlow(userId);
    if (activeFlow === "onboarding") {
      await replyAllLong(ctx, await handleOnboardingAnswer(userId, text));
      return;
    }
    if (activeFlow === "checkin") {
      await replyAllLong(ctx, await handleCheckinAnswer(userId, text));
      return;
    }

    const intent = await classifyIntent(text);

    switch (intent) {
      case "question": {
        const answer = await answerQuestion(userId, text);
        await replyLong(ctx, answer);
        break;
      }
      case "log_meal":
        await ctx.reply(
          "Got it — log that with:\n/logmeal <description> | <calories> | <protein> <carbs> <fat>",
        );
        break;
      case "log_workout":
        await ctx.reply(
          "Got it — log that with:\n/logworkout <exercise> | <sets>x<reps>@<weight>",
        );
        break;
      case "plan_request":
        await ctx.reply("Meal and workout plan generation is coming soon — not available yet.");
        break;
    }
  } catch (err) {
    console.error("message:text handler failed:", err);
    await ctx.reply("Something went wrong on my end — try that again in a moment.");
  }
});

bot.on("message:photo", async (ctx) => {
  const userId = await ensureUser(ctx.chat.id.toString());

  if (!(await hasCompletedOnboarding(userId))) {
    await ctx.reply("Let's finish setting up your profile first — send /onboarding.");
    return;
  }

  await ctx.reply("Reading your scale photo...");

  const photos = ctx.message.photo;
  const largest = photos[photos.length - 1];

  let parsed;
  try {
    const { base64, mediaType } = await downloadTelegramFile(bot, largest.file_id);
    parsed = await parseScalePhoto(base64, mediaType);
  } catch (err) {
    console.error("Scale photo parsing failed:", err);
    await ctx.reply("Couldn't read that photo — try again, or enter your weight manually.");
    return;
  }

  if (parsed.weightKg === null) {
    await ctx.reply("Couldn't find a weight in that photo — try again, or enter it manually.");
    return;
  }

  await clearFlow(userId);
  try {
    const replies = await completeCheckin(userId, {
      weightKg: parsed.weightKg,
      bodyFatPct: parsed.bodyFatPct,
      otherMetrics: parsed.otherMetrics,
    });
    await replyAllLong(ctx, replies);
  } catch (err) {
    console.error("completeCheckin from photo failed:", err);
    await ctx.reply(
      `Read ${parsed.weightKg}kg from the photo, but hit an error generating your updated plan — try again in a moment.`,
    );
  }
});

bot.catch((err) => {
  console.error("Bot error:", err);
});
