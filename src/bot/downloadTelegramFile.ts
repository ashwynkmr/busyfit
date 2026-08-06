import type { Bot } from "grammy";
import { config } from "../config.js";

export interface DownloadedFile {
  base64: string;
  mediaType: string;
}

const EXTENSION_MEDIA_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function downloadTelegramFile(bot: Bot, fileId: string): Promise<DownloadedFile> {
  const file = await bot.api.getFile(fileId);
  if (!file.file_path) {
    throw new Error("Telegram did not return a file path");
  }

  const url = `https://api.telegram.org/file/bot${config.telegramBotToken}/${file.file_path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Telegram file: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const extension = file.file_path.split(".").pop()?.toLowerCase() ?? "jpg";
  const mediaType = EXTENSION_MEDIA_TYPES[extension] ?? "image/jpeg";

  return { base64, mediaType };
}
