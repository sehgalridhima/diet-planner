import { NextResponse } from "next/server";
import { validateInput, type Goal, type UserInput } from "@/lib/nutrition";
import { buildPlan } from "@/lib/build-plan";
import { parseEquipment } from "@/lib/workout-planner";
import type { DietType } from "@/lib/plan-types";

/* ===============================================================
   PLAN API — for anonymous visitors filling in the form
   ===============================================================
   Signed-in users go through /today instead, which reads their
   saved profile and calls buildPlan directly.

   Three guards stand between a request and an API charge. Two of
   them (cache, fallback) live in build-plan.ts because the signed-in
   path needs them too. The third is here:

     Rate limit — one IP gets RATE_LIMIT fresh plans an hour.

   It belongs to the HTTP client rather than to the plan, and it must
   not follow a signed-in user around: being refused your own plan
   because a stranger behind the same NAT filled in the form five
   times would be indefensible.
   =============================================================== */

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

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
    // Optional. An empty field must read as "not given", not as zero.
    measuredBmr:
      body.measuredBmr === undefined || body.measuredBmr === null || body.measuredBmr === ""
        ? undefined
        : Number(body.measuredBmr),
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
  const kit = parseEquipment(equipment);
  const limited = rateLimited(clientKey(request));

  const result = await buildPlan(validInput, diet, kit, { allowAi: !limited });

  return NextResponse.json({
    ...result,
    ...(limited && !result.cached
      ? {
          notice:
            "You have reached the hourly limit for AI-generated plans. This plan came from the built-in planner instead — the numbers are identical, the food choices are less tailored.",
        }
      : {}),
  });
}
