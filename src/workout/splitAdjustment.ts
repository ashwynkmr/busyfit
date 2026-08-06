import { adjustWorkoutSplit } from "../llm/adjustWorkoutSplit.js";
import { formatSplitSummary } from "../flows/formatSplit.js";
import { getActiveSplit, saveNewSplitVersion } from "./getActiveSplit.js";
import { getRecentLogsSummary } from "./recentLogs.js";

export async function handleSplitAdjustmentRequest(
  userId: string,
  requestText: string,
): Promise<string> {
  const activeSplit = await getActiveSplit(userId);
  if (!activeSplit) {
    return "You don't have a workout split yet — send /onboarding to set one up first.";
  }

  const recentLogsSummary = await getRecentLogsSummary(userId);

  const { days, reason } = await adjustWorkoutSplit({
    currentDays: activeSplit.days,
    recentLogsSummary,
    requestOrTrigger: requestText,
  });

  const version = await saveNewSplitVersion(userId, days, reason);

  return (
    `**Updated your split (v${version}):** ${reason}\n\n${formatSplitSummary(days)}\n\n` +
    "Let me know if you want to tweak anything further."
  );
}
