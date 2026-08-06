import { anthropic, MODEL_COACH } from "./client.js";

export interface Recipe {
  mealType: "breakfast" | "lunch" | "dinner";
  name: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  ingredients: string[];
  steps: string[];
  variations: string[];
}

export interface ShoppingListSection {
  section: string;
  items: string[];
}

export interface MealPlanResult {
  recipes: Recipe[];
  shoppingList: ShoppingListSection[];
}

const GENERATE_MEAL_PLAN_TOOL = {
  name: "generate_meal_plan",
  description:
    "Generate a Sunday-batch-prep meal plan (one base recipe per meal type) and a shopping list.",
  input_schema: {
    type: "object" as const,
    properties: {
      recipes: {
        type: "array" as const,
        description: "Exactly 3 entries: one breakfast, one lunch, one dinner.",
        items: {
          type: "object" as const,
          properties: {
            mealType: { type: "string" as const, enum: ["breakfast", "lunch", "dinner"] },
            name: { type: "string" as const },
            servings: {
              type: "number" as const,
              description: "How many servings this batch makes (enough for the week)",
            },
            calories: { type: "number" as const, description: "Per serving" },
            protein: { type: "number" as const, description: "Grams, per serving" },
            carbs: { type: "number" as const, description: "Grams, per serving" },
            fat: { type: "number" as const, description: "Grams, per serving" },
            fiber: { type: "number" as const, description: "Grams, per serving" },
            ingredients: {
              type: "array" as const,
              items: { type: "string" as const },
              description: "Exact measurements scaled to the full batch, one ingredient per entry",
            },
            steps: {
              type: "array" as const,
              items: { type: "string" as const },
              description: "Short numbered steps for batch-cooking the whole thing at once",
            },
            variations: {
              type: "array" as const,
              items: { type: "string" as const },
              description:
                "2-3 quick swaps (sauce, seasoning, curry paste, etc.) to rotate across the week so the same base doesn't feel repetitive",
            },
          },
          required: [
            "mealType",
            "name",
            "servings",
            "calories",
            "protein",
            "carbs",
            "fat",
            "fiber",
            "ingredients",
            "steps",
            "variations",
          ],
        },
      },
      shoppingList: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            section: {
              type: "string" as const,
              description: "Grocery section, e.g. produce, protein, pantry, dairy",
            },
            items: {
              type: "array" as const,
              items: { type: "string" as const },
              description: "Real purchasable quantities, e.g. '2 lbs chicken thighs', '1 dozen eggs'",
            },
          },
          required: ["section", "items"],
        },
      },
    },
    required: ["recipes", "shoppingList"],
  },
};

export interface GenerateMealPlanInput {
  calorieTarget: number;
  proteinTargetG: number;
  cuisinePreference: string | null;
  dietaryRestrictions: string | null;
  mealStyle: string | null;
  groceryStore: string;
  batchServings?: number;
}

export async function generateMealPlan(input: GenerateMealPlanInput): Promise<MealPlanResult> {
  const servings = input.batchServings ?? 6;
  const prompt =
    `Generate a Sunday-meal-prep plan for a client with a daily target of ${input.calorieTarget} kcal ` +
    `and ${input.proteinTargetG}g protein. ` +
    `Give exactly one breakfast, one lunch, and one dinner recipe (3 recipes total), each batch-cooked ` +
    `once on Sunday for ${servings} servings and eaten across the week — not a unique recipe per day. ` +
    `For each recipe, include 2-3 variation notes (a different sauce, seasoning, or curry paste) so the ` +
    `client can rotate flavor through the week without recooking the base. ` +
    `Per-serving macros (calories, protein, carbs, fat, fiber) should combine across the 3 meals to land ` +
    `close to the daily targets. ` +
    (input.cuisinePreference ? `General cuisine preference: ${input.cuisinePreference}. ` : "") +
    (input.mealStyle ? `What they're in the mood for this specific week: ${input.mealStyle}. ` : "") +
    (input.dietaryRestrictions ? `Dietary restrictions: ${input.dietaryRestrictions}. ` : "") +
    `Use exact measurements scaled to the full batch. Keep recipes simple enough to home-cook in one ` +
    `session. Then generate a shopping list in real quantities as sold at ${input.groceryStore} ` +
    `(e.g. "2 lbs chicken thighs", "1 dozen eggs", "1 bag rice") — round up to realistic package sizes, ` +
    `not raw per-serving math.`;

  const response = await anthropic.messages.create({
    model: MODEL_COACH,
    max_tokens: 8192,
    tools: [GENERATE_MEAL_PLAN_TOOL],
    tool_choice: { type: "tool", name: "generate_meal_plan" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a meal plan");
  }

  const result = toolUse.input as Partial<MealPlanResult>;
  if (!result.recipes?.length || !result.shoppingList?.length) {
    throw new Error(
      `Meal plan generation returned incomplete data (stop_reason: ${response.stop_reason}) — likely truncated by max_tokens.`,
    );
  }

  return result as MealPlanResult;
}
