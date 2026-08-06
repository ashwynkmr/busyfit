import { anthropic, MODEL_ROUTER } from "./client.js";

export type Intent = "log_meal" | "log_workout" | "plan_request" | "question";

const CLASSIFY_TOOL = {
  name: "classify_intent",
  description: "Classify the user's message into exactly one intent category.",
  input_schema: {
    type: "object" as const,
    properties: {
      intent: {
        type: "string" as const,
        enum: ["log_meal", "log_workout", "plan_request", "question"],
        description:
          "log_meal: describes food they ate. log_workout: describes exercise they did. " +
          "plan_request: asks for a meal plan, recipe, or workout split/program. " +
          "question: any other open-ended coaching question or general conversation.",
      },
    },
    required: ["intent"],
  },
};

export async function classifyIntent(text: string): Promise<Intent> {
  const response = await anthropic.messages.create({
    model: MODEL_ROUTER,
    max_tokens: 64,
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: "tool", name: "classify_intent" },
    messages: [{ role: "user", content: text }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (toolUse && toolUse.type === "tool_use") {
    const input = toolUse.input as { intent: Intent };
    return input.intent;
  }

  return "question";
}
