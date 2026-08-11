import Anthropic from "@anthropic-ai/sdk";
import { CUISINE_OPTIONS, MEAL_SLOTS, type Cuisine, type DietType, type Dish, type MealPlan, type MealPool } from "@/lib/plan-types";
import type { Goal, NutritionPlan, UserInput } from "@/lib/nutrition";
import { assembleWeek } from "@/lib/week";
import { buildPool } from "@/lib/builtin-planner";
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

2. Portions the way people speak, WITH the weight in brackets after them. "2 roti (70 g atta)", "1 katori dal (250 g)", "1 glass milk (250 ml)", "1 bowl poha (60 g raw)". The spoken portion is what someone serves; the weight is what someone weighing their food needs. Give both, every time, and say "raw" or "cooked" wherever it changes the number — 60 g raw poha and 60 g cooked poha are not the same meal.

3. Hit the protein target. This is the number that matters most and the one Indian diets most often miss. On vegetarian and vegan plans you will have to work for it: dal, chana, rajma, paneer, tofu, soya chunks, curd, peanuts, sprouts. Do not quietly fall short.

4. Respect the diet type absolutely. Vegetarian means no egg and no meat. Eggetarian allows egg but no meat. Vegan excludes dairy entirely, which rules out curd, milk, paneer and ghee. A single violation makes the whole plan useless to the person reading it.

5. The dishes within a slot must be genuinely different from each other. This is the whole point of the pool — it is what stops someone eating the same breakfast seven mornings running. Vary the grain, the protein source and the region. Two dishes that differ only by the sabzi are one dish.

5a. VARY THE PROTEIN SOURCE ACROSS THE SLOT. No single source may carry more than three of the seven dishes in any slot. Curd and paneer are the easy answer to a protein target and they are the reason plans end up with dahi at every meal — spread the work across dal, chana, rajma, lobia, soya, tofu, sprouts, besan, egg and fish where the diet allows. If you find yourself reaching for paneer a fourth time, the dish is wrong, not the target.

5b. EVERY LUNCH AND DINNER GETS A VEGETABLE. A sabzi, a salad, a poriyal, a raita with something in it — something that is not the grain and not the protein. A plate of dal and rice with nothing green on it is not a meal anyone is pleased to sit down to, and it is where these plans start feeling like a punishment.

6. Every dish should land near the per-dish calorie target you are given for that slot. Within about fifty calories is fine.

7. Calories and protein must be your honest estimate for the portion you wrote. Do not round everything to the target — if a dish comes in low, say so in the number.

8. Notes must be practical and specific to this person's plan. No generic wellness advice, no motivational filler, no medical claims. Four notes at most. Say nothing about exercise: the training plan is built elsewhere and you have not seen it.

9. PROTEIN POWDER IS A LAST RESORT, AND ONLY IN THE SNACK SLOT. Never in breakfast, lunch or dinner — a scoop of whey is not a meal, and putting one in a meal is how you know the targets have been set too tight for real food. Use it only when a snack genuinely cannot reach its protein any other way. It must always come with a food alternative. If a day is short on protein you may offer "1 scoop whey (30 g)" — but write the food option beside it every time, because most people would rather eat than buy a tub: "1 scoop whey (30 g) or 1 katori sattu (40 g) or 100 g paneer". On a vegan plan the powder is soy or pea, never whey. Telling a vegetarian they are 30 g short and then refusing to say how to close it is useless advice.

10. Nothing else that comes in a tub or a packet. No fat burners, no appetite suppressants, no meal-replacement shakes, no creatine loading protocols, no fasting protocols, no medication, and nothing that would need a doctor's supervision.

11. If a regional cuisine is named, cook in it. South Indian means idli, dosa, sambar, rasam, poriyal, upma and curd rice, not roti and sabzi with a curry leaf on top. Bengali means fish in mustard, cholar dal, shukto, luchi. Gujarati means dhokla, thepla, handvo, kadhi. Continental means the person wants oats, grilled protein, salads and pasta rather than Indian food, and rule 1 gives way to that. Regional cooking is the point of naming a region, so change the grains, the fats and the technique, not just the name of the sabzi.

12. If the person names a food they are craving, build it into the plan rather than leaving it out. Fit it to the calorie target — a smaller portion, or a lighter meal elsewhere in the day to make room — and put it in the meal it belongs in. A plan someone enjoys gets followed; a technically perfect one they resent does not. Never lecture them about the craving, and never substitute something "healthier" and pretend it is the same thing.

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

/** Two dishes are the same dish if they list the same things. */
function signature(dish: Dish): string {
  return dish.items
    .map((i) => i.trim().toLowerCase())
    .sort()
    .join("|");
}

/**
 * Removes duplicates from Claude's pool and refills any slot left
 * short from the built-in table.
 *
 * The schema asks for seven options per slot but cannot require them
 * to be different, and asking nicely in the prompt is not a guarantee
 * — a real vegan plan came back with five distinct lunches for seven
 * days, and the rotation dutifully repeated two of them. Variety is
 * the whole reason the week exists, so it gets a backstop rather than
 * a request.
 *
 * Topping up from the table also keeps the failure graceful: a slot
 * that comes back thin degrades to built-in dishes for the surplus
 * days instead of repeating what Claude did send.
 */
export function topUpPool(pool: MealPool, diet: DietType): void {
  const fallback = buildPool(diet);

  for (const slot of MEAL_SLOTS) {
    const seen = new Set<string>();
    const unique: Dish[] = [];

    for (const dish of pool[slot]) {
      const key = signature(dish);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(dish);
    }

    for (const dish of fallback[slot]) {
      if (unique.length >= DISHES_PER_SLOT) break;
      const key = signature(dish);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(dish);
    }

    pool[slot] = unique;
  }
}

export async function buildAiPlan(
  nutrition: NutritionPlan,
  input: UserInput,
  diet: DietType,
  equipment: Equipment,
  /** Something they actually want to eat this week, in their words */
  craving = "",
  /** Regional cuisine to lean the week toward */
  cuisine: Cuisine = "any",
): Promise<AiResult> {
  const client = new Anthropic();

  const cuisineLabel =
    cuisine === "any" ? "" : (CUISINE_OPTIONS.find((c) => c.value === cuisine)?.label ?? "");

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
- Diet: ${DIET_LABEL[diet]}${cuisineLabel ? `\n- Cuisine they want: ${cuisineLabel}` : ""}${craving ? `\n- Craving right now: ${craving}` : ""}

Return ${DISHES_PER_SLOT} clearly different options for breakfast, lunch, snack and dinner.${
          craving
            ? ` Work what they are craving into at least two of these options, at portions that fit the targets.`
            : ""
        }`,
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

  topUpPool(pool, diet);

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
