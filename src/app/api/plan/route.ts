import { NextResponse } from "next/server";
import {
  buildNutritionPlan,
  validateInput,
  type Goal,
  type NutritionPlan,
  type UserInput,
} from "@/lib/nutrition";
import { buildBuiltinPlan } from "@/lib/builtin-planner";
import { buildAiPlan, estimateCostInr, hasApiKey } from "@/lib/ai-planner";
import type { DietType, MealPlan } from "@/lib/plan-types";

/* ===============================================================
   PLAN API
   ===============================================================
   Three guards stand between a request and an API charge:

     1. Rate limit  — one IP gets RATE_LIMIT plans an hour.
     2. Cache       — identical inputs return the stored plan, free.
     3. Fallback    — no key, or a failed call, uses the built-in
                      planner rather than failing.

   The cache and rate limiter live in memory. On serverless each
   instance keeps its own copy, so both are best-effort rather than
   exact — good enough to stop a person hammering the form, not a
   substitute for the spend limit set in the Anthropic console.
   =============================================================== */

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

type CacheEntry = { plan: MealPlan; nutrition: NutritionPlan; storedAt: number };

const cache = new Map<string, CacheEntry>();
const hits = new Map<string, number[]>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

/**
 * Inputs are rounded before they become the cache key, so people who
 * are close to each other share a plan instead of each paying for one.
 */
function cacheKey(input: UserInput, diet: DietType, equipment: string): string {
  return [
    Math.round(input.age / 5) * 5,
    input.sex,
    Math.round(input.heightCm / 5) * 5,
    Math.round(input.weightKg / 5) * 5,
    input.activity,
    input.goal,
    diet,
    equipment,
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

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read that request." }, { status: 400 });
  }

  const input: Partial<UserInput> = {
    age: Number(body.age),
    sex: body.sex as UserInput["sex"],
    heightCm: Number(body.heightCm),
    weightKg: Number(body.weightKg),
    activity: body.activity as UserInput["activity"],
    goal: body.goal as Goal,
  };

  const errors = validateInput(input);
  const diet = body.diet as DietType;
  if (!["veg", "egg", "nonveg", "vegan"].includes(diet)) {
    errors.push("Please select a diet type.");
  }

  const equipment =
    typeof body.equipment === "string" && body.equipment.trim() !== ""
      ? body.equipment.trim().slice(0, 120)
      : "bodyweight only";

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const validInput = input as UserInput;
  const nutrition = buildNutritionPlan(validInput);
  const key = cacheKey(validInput, diet, equipment);

  // 1. Cache — free, and instant
  const cached = readCache(key);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  // 2. Rate limit — only reached when this would be a fresh generation
  if (rateLimited(clientKey(request))) {
    const fallback = buildBuiltinPlan(nutrition, diet, validInput.goal);
    return NextResponse.json({
      plan: fallback,
      nutrition,
      cached: false,
      notice:
        "You have reached the hourly limit for AI-generated plans. This plan came from the built-in planner instead — the numbers are identical, the food choices are less tailored.",
    });
  }

  // 3. Generate
  if (hasApiKey()) {
    try {
      const { plan, usage } = await buildAiPlan(nutrition, diet, validInput.goal, equipment);
      writeCache(key, { plan, nutrition, storedAt: Date.now() });
      console.log(
        `[plan] AI ok — in ${usage.inputTokens}, cached-in ${usage.cacheReadTokens}, out ${usage.outputTokens}, approx Rs.${estimateCostInr(usage).toFixed(2)}`,
      );
      return NextResponse.json({ plan, nutrition, cached: false });
    } catch (error) {
      console.error("[plan] AI failed, using built-in planner:", error);
    }
  }

  const plan = buildBuiltinPlan(nutrition, diet, validInput.goal);
  writeCache(key, { plan, nutrition, storedAt: Date.now() });
  return NextResponse.json({ plan, nutrition, cached: false });
}
