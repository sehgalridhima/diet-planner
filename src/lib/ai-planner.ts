import Anthropic from "@anthropic-ai/sdk";
import type { DietType, MealPlan } from "@/lib/plan-types";
import type { Goal, NutritionPlan } from "@/lib/nutrition";

/* ===============================================================
   AI PLANNER — the only file that spends API credit
   ===============================================================
   Every cost decision lives here, so there is one place to look
   when the bill is higher than expected:

   1. The system prompt is CACHED. It is identical on every request,
      so after the first call it bills at roughly a tenth of the
      normal input rate.
   2. effort is LOW. Picking meals off a target is not a reasoning
      problem — high effort would spend thinking tokens for nothing.
   3. The output is SCHEMA-CONSTRAINED. The model returns exactly the
      fields we render and cannot pad the response with prose.
   4. The MATH IS NOT THE MODEL'S JOB. Calories, macros and safety
      limits are already computed. Claude only chooses food that fits
      the numbers it is handed.

   If a call fails for any reason, the caller falls back to the
   built-in planner — a user never sees an error page.
   =============================================================== */

const MODEL = "claude-opus-5";

/**
 * Kept byte-identical across requests so the prompt cache always hits.
 * Do not interpolate user data, dates, or anything else in here —
 * a single changed character invalidates the cache for every user.
 */
const SYSTEM_PROMPT = `You are a careful Indian nutritionist building a single day of eating for one person.

You are given calorie and macro targets that have already been calculated and safety-checked. Treat them as fixed. Your only job is choosing food that fits them.

RULES

1. Indian home food, always. Dal, roti, sabzi, rice, curd, paneer, idli, poha, upma, chilla, khichdi, rajma, chana, sambar. Not quinoa bowls, not salmon, not protein powders, not anything a normal Indian kitchen would not have on a weekday.

2. Portions the way people speak, never grams for staples. "2 roti", "1 katori dal", "1 glass milk", "1 bowl poha". Grams are fine only for meat, paneer and tofu, where people genuinely buy by weight.

3. Hit the protein target. This is the number that matters most and the one Indian diets most often miss. On vegetarian and vegan plans you will have to work for it: dal, chana, rajma, paneer, tofu, soya chunks, curd, peanuts, sprouts. Do not quietly fall short.

4. Respect the diet type absolutely. Vegetarian means no egg and no meat. Eggetarian allows egg but no meat. Vegan excludes dairy entirely, which rules out curd, milk, paneer and ghee. A single violation makes the whole plan useless to the person reading it.

5. Every meal needs a swap. Give one genuinely different alternative at roughly the same calories, so the person has somewhere to go on a day they do not want what is listed.

6. Meal calories should add up to close to the daily target. Being within about fifty calories is fine; being far off is not.

7. Notes must be practical and specific to this person's plan. No generic wellness advice, no motivational filler, no medical claims. Four notes at most.

8. Never suggest supplements, medication, fasting protocols, or anything that would need a doctor's supervision.

Write in plain, warm English. Short sentences. Assume the reader is busy and slightly sceptical of diet plans, because they have been given useless ones before.`;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slot: { type: "string", enum: ["Breakfast", "Lunch", "Snack", "Dinner"] },
          items: {
            type: "array",
            items: { type: "string" },
            description: "Each item as a portion, e.g. '2 roti' or '1 katori dal'",
          },
          calories: { type: "integer" },
          proteinG: { type: "integer" },
          swap: { type: "string", description: "One alternative at similar calories" },
        },
        required: ["slot", "items", "calories", "proteinG", "swap"],
        additionalProperties: false,
      },
    },
    workout: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "string" },
          focus: { type: "string" },
          exercises: { type: "array", items: { type: "string" } },
        },
        required: ["day", "focus", "exercises"],
        additionalProperties: false,
      },
    },
    notes: { type: "array", items: { type: "string" } },
  },
  required: ["meals", "workout", "notes"],
  additionalProperties: false,
} as const;

const DIET_LABEL: Record<DietType, string> = {
  veg: "Vegetarian (no egg, no meat)",
  egg: "Eggetarian (egg allowed, no meat)",
  nonveg: "Non-vegetarian (everything)",
  vegan: "Vegan (no dairy at all)",
};

const GOAL_LABEL: Record<Goal, string> = {
  lose: "lose fat",
  maintain: "maintain weight",
  gain: "build muscle",
};

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type AiResult = { plan: MealPlan; usage: AiUsage };

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function buildAiPlan(
  nutrition: NutritionPlan,
  diet: DietType,
  goal: Goal,
  equipment: string,
): Promise<AiResult> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      // Low effort: this is a selection task, not a reasoning one.
      effort: "low",
      format: { type: "json_schema", schema: PLAN_SCHEMA },
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // Cached: identical every request, so it bills at ~10% after the first call.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Build one day of eating and a weekly workout split.

Daily targets (already calculated — do not recalculate):
- Calories: ${nutrition.calories} kcal
- Protein: ${nutrition.macros.proteinG} g
- Carbohydrate: ${nutrition.macros.carbsG} g
- Fat: ${nutrition.macros.fatG} g

Person:
- Goal: ${GOAL_LABEL[goal]}
- Diet: ${DIET_LABEL[diet]}
- Equipment available: ${equipment}

Give four meals (Breakfast, Lunch, Snack, Dinner) and a seven-day workout split using only the equipment listed.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text block");
  }

  const parsed = JSON.parse(textBlock.text) as Omit<MealPlan, "source">;

  return {
    plan: { ...parsed, source: "ai" },
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
    },
  };
}

/** Rough rupee cost of one call, for the usage log. Opus 5: $5/M in, $25/M out. */
export function estimateCostInr(usage: AiUsage, usdToInr = 90): number {
  const inputUsd = (usage.inputTokens / 1_000_000) * 5;
  const cacheReadUsd = (usage.cacheReadTokens / 1_000_000) * 0.5;
  const cacheWriteUsd = (usage.cacheWriteTokens / 1_000_000) * 6.25;
  const outputUsd = (usage.outputTokens / 1_000_000) * 25;
  return (inputUsd + cacheReadUsd + cacheWriteUsd + outputUsd) * usdToInr;
}
