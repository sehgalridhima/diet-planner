import Anthropic from "@anthropic-ai/sdk";
import { MEAL_SLOTS, type DietType, type Dish, type MealPlan, type MealPool } from "@/lib/plan-types";
import type { Goal, NutritionPlan, UserInput } from "@/lib/nutrition";
import { assembleWeek } from "@/lib/week";
import { buildWorkout, type Equipment } from "@/lib/workout-planner";

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
   5. THE WORKOUT NEVER COMES FROM HERE. A training split is a lookup
      and a few rules, so workout-planner.ts builds it in code for
      free. Dropping it from this response paid for most of the extra
      tokens the week of meals costs.
   6. CLAUDE RETURNS A POOL, NOT A WEEK. Seven dishes per slot, and
      week.ts assembles the days. Asking for seven finished days would
      repeat every target and every swap seven times over.

   If a call fails for any reason, the caller falls back to the
   built-in planner — a user never sees an error page.
   =============================================================== */

const MODEL = "claude-opus-5";

/** One dish per day of the week, per slot. */
const DISHES_PER_SLOT = 7;

/**
 * Kept byte-identical across requests so the prompt cache always hits.
 * Do not interpolate user data, dates, or anything else in here —
 * a single changed character invalidates the cache for every user.
 */
const SYSTEM_PROMPT = `You are a careful Indian nutritionist choosing food for one person's week.

You are given calorie and macro targets that have already been calculated and safety-checked. Treat them as fixed. Your only job is choosing food that fits them.

You return a POOL of dish options for each meal slot, not a finished plan. Software downstream picks which dish lands on which day and adjusts portions. So every dish you return must be a complete, standalone option for that slot — not a half meal, and not a variation on the dish above it.

RULES

1. Indian home food, always. Dal, roti, sabzi, rice, curd, paneer, idli, poha, upma, chilla, khichdi, rajma, chana, sambar. Not quinoa bowls, not salmon, not protein powders, not anything a normal Indian kitchen would not have on a weekday.

2. Portions the way people speak, never grams for staples. "2 roti", "1 katori dal", "1 glass milk", "1 bowl poha". Grams are fine only for meat, paneer and tofu, where people genuinely buy by weight.

3. Hit the protein target. This is the number that matters most and the one Indian diets most often miss. On vegetarian and vegan plans you will have to work for it: dal, chana, rajma, paneer, tofu, soya chunks, curd, peanuts, sprouts. Do not quietly fall short.

4. Respect the diet type absolutely. Vegetarian means no egg and no meat. Eggetarian allows egg but no meat. Vegan excludes dairy entirely, which rules out curd, milk, paneer and ghee. A single violation makes the whole plan useless to the person reading it.

5. The dishes within a slot must be genuinely different from each other. This is the whole point of the pool — it is what stops someone eating the same breakfast seven mornings running. Vary the grain, the protein source and the region. Two dishes that differ only by the sabzi are one dish.

6. Every dish should land near the per-dish calorie target you are given for that slot. Within about fifty calories is fine.

7. Calories and protein must be your honest estimate for the portion you wrote. Do not round everything to the target — if a dish comes in low, say so in the number.

8. Notes must be practical and specific to this person's plan. No generic wellness advice, no motivational filler, no medical claims. Four notes at most. Say nothing about exercise: the training plan is built elsewhere and you have not seen it.

9. Never suggest supplements, medication, fasting protocols, or anything that would need a doctor's supervision.

Write in plain, warm English. Short sentences. Assume the reader is busy and slightly sceptical of diet plans, because they have been given useless ones before.`;

const DISH_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: { type: "string" },
        description: "Each item as a portion, e.g. '2 roti' or '1 katori dal'",
      },
      calories: { type: "integer" },
      proteinG: { type: "integer" },
    },
    required: ["items", "calories", "proteinG"],
    additionalProperties: false,
  },
} as const;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    breakfast: DISH_SCHEMA,
    lunch: DISH_SCHEMA,
    snack: DISH_SCHEMA,
    dinner: DISH_SCHEMA,
    notes: { type: "array", items: { type: "string" } },
  },
  required: ["breakfast", "lunch", "snack", "dinner", "notes"],
  additionalProperties: false,
} as const;

type AiPool = {
  breakfast: Dish[];
  lunch: Dish[];
  snack: Dish[];
  dinner: Dish[];
  notes: string[];
};

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
  input: UserInput,
  diet: DietType,
  equipment: Equipment,
): Promise<AiResult> {
  const client = new Anthropic();

  // Per-dish targets, so Claude aims at a meal rather than a day.
  const perSlot = MEAL_SLOTS.map((slot) => {
    const share = slot === "Breakfast" ? 0.25 : slot === "Lunch" ? 0.35 : slot === "Snack" ? 0.1 : 0.3;
    return `- ${slot}: about ${Math.round(nutrition.calories * share)} kcal and ${Math.round(
      nutrition.macros.proteinG * share,
    )} g protein per dish`;
  }).join("\n");

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
        content: `Give ${DISHES_PER_SLOT} dish options for each meal slot.

Daily targets (already calculated — do not recalculate):
- Calories: ${nutrition.calories} kcal
- Protein: ${nutrition.macros.proteinG} g
- Carbohydrate: ${nutrition.macros.carbsG} g
- Fat: ${nutrition.macros.fatG} g

Per-dish targets:
${perSlot}

Person:
- Goal: ${GOAL_LABEL[input.goal]}
- Diet: ${DIET_LABEL[diet]}

Return ${DISHES_PER_SLOT} clearly different options for breakfast, lunch, snack and dinner.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text block");
  }

  const parsed = JSON.parse(textBlock.text) as AiPool;

  const pool: MealPool = {
    Breakfast: parsed.breakfast,
    Lunch: parsed.lunch,
    Snack: parsed.snack,
    Dinner: parsed.dinner,
  };

  // An empty slot would silently drop a meal from all seven days.
  for (const slot of MEAL_SLOTS) {
    if (!pool[slot] || pool[slot].length === 0) {
      throw new Error(`Claude returned no dishes for ${slot}`);
    }
  }

  const days = assembleWeek(pool, nutrition.calories, nutrition.macros.proteinG);

  const workout = buildWorkout({
    goal: input.goal,
    activity: input.activity,
    age: input.age,
    equipment,
    lowImpactOnly: input.age >= 55 || nutrition.bmi >= 30,
  });

  return {
    plan: {
      days,
      workout: workout.days,
      notes: [...parsed.notes, ...workout.notes],
      source: "ai",
    },
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
