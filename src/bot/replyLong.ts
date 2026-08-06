import type { Context } from "grammy";

// Telegram caps messages at 4096 chars; keep a margin and split on that boundary
// so weekly plans/recipes render as multiple scannable messages, not one wall of text.
const CHUNK_SIZE = 3500;

export async function replyLong(ctx: Context, text: string): Promise<void> {
  const chunks = text.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, "g")) ?? [text];
  for (const chunk of chunks) {
    await ctx.reply(chunk);
  }
}

export async function replyAllLong(ctx: Context, messages: string[]): Promise<void> {
  for (const message of messages) {
    await replyLong(ctx, message);
  }
}
