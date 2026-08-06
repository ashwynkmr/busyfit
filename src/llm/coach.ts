import { anthropic, MODEL_COACH } from "./client.js";
import { buildUserContext } from "./buildContext.js";
import { buildSystemPrompt } from "./systemPrompt.js";
import { getRecentMessages, recordMessage } from "./conversationHistory.js";

export async function answerQuestion(userId: string, question: string): Promise<string> {
  const [contextBlock, recentMessages] = await Promise.all([
    buildUserContext(userId),
    getRecentMessages(userId),
  ]);

  const response = await anthropic.messages.create({
    model: MODEL_COACH,
    max_tokens: 1024,
    system: buildSystemPrompt(contextBlock),
    messages: [...recentMessages, { role: "user", content: question }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const answer = textBlock && textBlock.type === "text" ? textBlock.text : "";

  await recordMessage(userId, "user", question);
  await recordMessage(userId, "assistant", answer);

  return answer;
}
