import { anthropic, MODEL_COACH } from "./client.js";

export interface SupplementGuidanceInput {
  age: number;
  sex: string;
  dietaryRestrictions: string | null;
  cuisinePreference: string | null;
}

export async function generateSupplementGuidance(input: SupplementGuidanceInput): Promise<string> {
  const prompt =
    `Give brief, general baseline supplement guidance (e.g. fiber, magnesium, vitamin D, omega-3, ` +
    `B12) for a ${input.age}-year-old, sex: ${input.sex}` +
    (input.dietaryRestrictions ? `, dietary restrictions: ${input.dietaryRestrictions}` : "") +
    (input.cuisinePreference ? `, typical diet style: ${input.cuisinePreference}` : "") +
    `. This is qualitative, general-population guidance based on common gaps for these factors — ` +
    `not a precise or personalized prescription, and you should say so briefly. Keep it to 2-4 short ` +
    `sentences, no headers, no disclaimers beyond one brief honesty note.`;

  const response = await anthropic.messages.create({
    model: MODEL_COACH,
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
