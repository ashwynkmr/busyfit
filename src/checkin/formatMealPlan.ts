import type { MealPlanResult, Recipe } from "../llm/generateMealPlan.js";

const MEAL_TYPE_LABEL: Record<Recipe["mealType"], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

function formatRecipeMessage(recipe: Recipe): string {
  const ingredients = recipe.ingredients.join("\n");
  const steps = recipe.steps.map((step, i) => `${i + 1}. ${step}`).join("\n");
  const variations = recipe.variations.map((line) => `- ${line}`).join("\n");

  return (
    `**${MEAL_TYPE_LABEL[recipe.mealType]}: ${recipe.name}** (${recipe.servings} servings)\n` +
    `${recipe.calories} kcal, ${recipe.protein}g protein, ${recipe.carbs}g carbs, ${recipe.fat}g fat, ${recipe.fiber}g fiber — per serving\n\n` +
    `Ingredients (full batch):\n${ingredients}\n\n` +
    `Steps:\n${steps}\n\n` +
    `**Rotate through the week:**\n${variations}`
  );
}

export function formatRecipeMessages(plan: MealPlanResult): string[] {
  return plan.recipes.map(formatRecipeMessage);
}

export function formatShoppingListMessage(plan: MealPlanResult): string {
  return plan.shoppingList
    .map((section) => `**${section.section}**\n` + section.items.map((item) => `- ${item}`).join("\n"))
    .join("\n\n");
}
