import { anthropic, MODEL_COACH } from "./client.js";

export interface ScalePhotoResult {
  weightKg: number | null;
  bodyFatPct: number | null;
  otherMetrics: Record<string, number>;
}

const PARSE_SCALE_TOOL = {
  name: "parse_scale_reading",
  description: "Extract body composition metrics from a smart scale app screenshot.",
  input_schema: {
    type: "object" as const,
    properties: {
      weightKg: {
        type: ["number", "null"],
        description: "Weight converted to kg if shown in another unit. Null if not visible.",
      },
      bodyFatPct: { type: ["number", "null"], description: "Body fat %, null if not shown" },
      bmi: { type: "number" as const },
      fatFreeBodyWeightKg: { type: "number" as const },
      subcutaneousFatPct: { type: "number" as const },
      bodyWaterPct: { type: "number" as const },
      skeletalMusclePct: { type: "number" as const },
      boneMassKg: { type: "number" as const },
      bmrKcal: { type: "number" as const },
      visceralFat: { type: "number" as const },
      muscleMassKg: { type: "number" as const },
      proteinPct: { type: "number" as const },
      metabolicAge: { type: "number" as const },
    },
    required: ["weightKg", "bodyFatPct"],
  },
};

const OTHER_METRIC_KEYS = [
  "bmi",
  "fatFreeBodyWeightKg",
  "subcutaneousFatPct",
  "bodyWaterPct",
  "skeletalMusclePct",
  "boneMassKg",
  "bmrKcal",
  "visceralFat",
  "muscleMassKg",
  "proteinPct",
  "metabolicAge",
] as const;

export async function parseScalePhoto(base64: string, mediaType: string): Promise<ScalePhotoResult> {
  const response = await anthropic.messages.create({
    model: MODEL_COACH,
    max_tokens: 1024,
    tools: [PARSE_SCALE_TOOL],
    tool_choice: { type: "tool", name: "parse_scale_reading" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType as "image/jpeg", data: base64 },
          },
          {
            type: "text",
            text: "Extract every body composition metric visible in this smart scale app screenshot.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return scale readings");
  }

  const input = toolUse.input as Record<string, number | null>;
  const otherMetrics: Record<string, number> = {};
  for (const key of OTHER_METRIC_KEYS) {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      otherMetrics[key] = value;
    }
  }

  return {
    weightKg: typeof input.weightKg === "number" ? input.weightKg : null,
    bodyFatPct: typeof input.bodyFatPct === "number" ? input.bodyFatPct : null,
    otherMetrics,
  };
}
