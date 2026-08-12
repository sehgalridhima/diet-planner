import { NextResponse } from "next/server";
import {
  askCoach,
  planContext,
  MAX_QUESTION_CHARS,
  type CoachTurn,
} from "@/lib/coach";
import type { NutritionPlan } from "@/lib/nutrition";
import type { MealPlan } from "@/lib/plan-types";

/* ===============================================================
   COACH API
   ===============================================================
   Unlike a plan, a question has no natural stopping point, so the
   limit here is the feature rather than a guard on it: five
   questions an hour, and the count is sent back with every answer
   so the UI can show it rather than surprising someone at the end.

   Five matches the plan limit, which keeps the two consistent, and
   caps one visitor at roughly two rupees of credit.

   The count lives in memory, exactly like the plan limiter, and has
   the same weakness: serverless instances come and go and do not
   share it, so a determined person gets more than five. That is
   acceptable for casual overuse — the hard ceiling is the monthly
   spend limit on the Anthropic account, which is the only thing
   that can actually stop the bill.

   There is no fallback. The built-in planner can produce a plan
   without Claude, but nothing can answer a question without it, so
   a failure here says so plainly instead of pretending.
   =============================================================== */

const QUESTION_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const hits = new Map<string, number[]>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** Questions left in this window, without spending one. */
function remainingFor(key: string): number {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.set(key, recent);
  return Math.max(0, QUESTION_LIMIT - recent.length);
}

function spendOne(key: string): void {
  const recent = hits.get(key) ?? [];
  recent.push(Date.now());
  hits.set(key, recent);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read that request." }, { status: 400 });
  }

  const question =
    typeof body.question === "string" ? body.question.trim().slice(0, MAX_QUESTION_CHARS) : "";

  if (!question) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }

  const plan = body.plan as MealPlan | undefined;
  const nutrition = body.nutrition as NutritionPlan | undefined;

  if (!plan || !nutrition || !Array.isArray(plan.days) || typeof nutrition.calories !== "number") {
    return NextResponse.json(
      { error: "Make a plan first — the coach answers questions about it." },
      { status: 400 },
    );
  }

  /*
   * History arrives from the browser, so it is shaped and trimmed
   * here rather than trusted. Anything longer than a real answer is
   * cut: it would be paid for as input on every turn.
   */
  const history: CoachTurn[] = Array.isArray(body.history)
    ? (body.history as unknown[])
        .filter(
          (turn): turn is { role: string; text: string } =>
            typeof turn === "object" &&
            turn !== null &&
            typeof (turn as { text?: unknown }).text === "string" &&
            ((turn as { role?: unknown }).role === "user" ||
              (turn as { role?: unknown }).role === "assistant"),
        )
        .slice(-10)
        .map((turn) => ({
          role: turn.role as "user" | "assistant",
          text: turn.text.slice(0, 1500),
        }))
    : [];

  const key = clientKey(request);

  if (remainingFor(key) <= 0) {
    return NextResponse.json(
      {
        error: `That is ${QUESTION_LIMIT} questions this hour, which is the limit. Try again a little later — your plan stays where it is.`,
        remaining: 0,
      },
      { status: 429 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "The coach isn't switched on for this site yet." },
      { status: 503 },
    );
  }

  // Charged before the call, not after: a request that fails halfway
  // may still have cost something, and retrying it in a loop must not
  // be free.
  spendOne(key);

  try {
    const answer = await askCoach(question, planContext(plan, nutrition), history);
    return NextResponse.json({ answer: answer.text, remaining: remainingFor(key) });
  } catch {
    return NextResponse.json(
      {
        error: "Couldn't get an answer just then. Try asking again.",
        remaining: remainingFor(key),
      },
      { status: 502 },
    );
  }
}

/** Lets the widget show the right count before anyone has asked anything. */
export async function GET(request: Request) {
  return NextResponse.json({ remaining: remainingFor(clientKey(request)) });
}
