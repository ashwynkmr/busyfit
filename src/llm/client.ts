import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";

export const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

// Sonnet for persona-driven coaching, a cheaper/faster model for routing (TRD 04/05).
export const MODEL_COACH = "claude-sonnet-5";
export const MODEL_ROUTER = "claude-haiku-4-5-20251001";
