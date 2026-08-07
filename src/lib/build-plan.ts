import { buildNutritionPlan, type NutritionPlan, type UserInput } from "@/lib/nutrition";
import { buildBuiltinPlan } from "@/lib/builtin-planner";
import { buildAiPlan, estimateCostInr, hasApiKey } from "@/lib/ai-planner";
import type { DietType, MealPlan } from "@/lib/plan-types";
import type { Equipment } from "@/lib/workout-planner";

/* ===============================================================
   PLAN BUILDING — one path, two callers
   ===============================================================
   The API route (for anonymous visitors filling in the form) and
   the signed-in /today page both need a plan from the same inputs.
   Keeping that in one place is what stops them drifting apart and
   showing two different weeks for the same person.

   Cost control lives here because both callers need it:
     1. Cache   — identical rounded inputs return the stored plan, free.
     2. Fallback — no key, or a failed call, uses the built-in planner.

   Rate limiting stays in the route: it is a property of an HTTP
   client, not of a plan, and the signed-in page must never be
   refused a plan for something an anonymous visitor did.
   =============================================================== */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

type CacheEntry = { plan: MealPlan; nutrition: NutritionPlan; storedAt: number };

/*
 * In memory, so on serverless each instance keeps its own copy. That
 * makes it best-effort rather than exact — good enough to stop a
 * person hammering the form, not a substitute for the spend limit set
 * in the Anthropic console.
 */
const cache = new Map<string, CacheEntry>();

/**
 * Inputs are rounded before they become the key, so people who are
 * close to each other share a plan instead of each paying for one.
 */
function cacheKey(
  input: UserInput,
  diet: DietType,
  equipment: Equipment,
  craving: string,
): string {
  return [
    Math.round(input.age / 5) * 5,
    input.sex,
    Math.round(input.heightCm / 5) * 5,
    Math.round(input.weightKg / 5) * 5,
    input.activity,
    input.goal,
    diet,
    equipment,
    // A measured BMR changes every calorie downstream, so two people
    // who differ only here must not share a cached plan.
    input.measuredBmr ? Math.round(input.measuredBmr / 25) * 25 : "-",
    // Two people wanting different things must not share a plan.
    craving.toLowerCase().trim(),
  ].join("|");
}

function readCache(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function writeCache(key: string, entry: CacheEntry) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, entry);
}

export type PlanResult = {
  plan: MealPlan;
  nutrition: NutritionPlan;
  cached: boolean;
};

export async function buildPlan(
  input: UserInput,
  diet: DietType,
  equipment: Equipment,
  options: { allowAi?: boolean; craving?: string } = {},
): Promise<PlanResult> {
  const { allowAi = true, craving = "" } = options;

  const nutrition = buildNutritionPlan(input);
  const key = cacheKey(input, diet, equipment, craving);

  const cached = readCache(key);
  if (cached) {
    return { plan: cached.plan, nutrition: cached.nutrition, cached: true };
  }

  if (allowAi && hasApiKey()) {
    try {
      const { plan, usage } = await buildAiPlan(nutrition, input, diet, equipment, craving);
      writeCache(key, { plan, nutrition, storedAt: Date.now() });
      console.log(
        `[plan] AI ok — in ${usage.inputTokens}, cached-in ${usage.cacheReadTokens}, out ${usage.outputTokens}, approx Rs.${estimateCostInr(usage).toFixed(2)}`,
      );
      return { plan, nutrition, cached: false };
    } catch (error) {
      console.error("[plan] AI failed, using built-in planner:", error);
    }
  }

  const plan = buildBuiltinPlan(nutrition, input, diet, equipment, craving);
  writeCache(key, { plan, nutrition, storedAt: Date.now() });
  return { plan, nutrition, cached: false };
}
