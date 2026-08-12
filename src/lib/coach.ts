import Anthropic from "@anthropic-ai/sdk";
import type { NutritionPlan } from "@/lib/nutrition";
import type { MealPlan } from "@/lib/plan-types";

/* ===============================================================
   COACH — the second place that spends API credit
   ===============================================================
   ai-planner.ts spends once per plan. This spends once per QUESTION,
   which is a different shape of risk: a plan is one call with a
   known size, a conversation has no natural end. Everything here is
   arranged around bounding that.

   1. HAIKU, NOT OPUS. The plan is already in the context window.
      Answering "can I swap Tuesday's lunch" is reading and
      explaining, not reasoning from scratch — roughly a fifth the
      cost of the model that built the plan.
   2. NO THINKING. Same reason. Thinking tokens bill as output, and
      there is nothing here to think about.
   3. SHORT ANSWERS. max_tokens is deliberately small. Output is five
      times the price of input, so it is the number worth holding
      down, and a chatty diet bot is worse to use anyway.
   4. HISTORY IS TRIMMED. Only the last few turns are sent. Without
      this every answer costs more than the one before it.
   5. THE CONTEXT IS TRUNCATED SERVER-SIDE. The plan arrives from the
      browser, so its size is not ours to trust.
   6. THE NUMBERS ARE STILL NOT THE MODEL'S JOB. Same rule as the
      planner: Claude reads the calculated targets and explains them.
      It never works one out.

   No prompt cache here, deliberately. Haiku 4.5 will not cache a
   prefix below 4096 tokens and this system prompt is nowhere near
   that, so a cache_control marker would look like an optimisation
   while doing nothing. The input is small enough that it does not
   matter.
   =============================================================== */

const MODEL = "claude-haiku-4-5";

/** Answers should be a few sentences. This is the main cost lever. */
const MAX_TOKENS = 700;

/** Turns of history sent back. Five questions is the cap, so this covers most of one. */
const HISTORY_LIMIT = 6;

/**
 * Hard ceiling on the plan context, whatever the browser posts.
 *
 * A real week runs to about 9,800 characters, so this is headroom
 * rather than a budget — it exists to stop a doctored request from
 * posting a megabyte of "plan" and billing it as input. The first
 * version of this was 6,000, which quietly cut the training week and
 * the notes off the end of every genuine plan: the coach then
 * answered "is this workout too much?" without having been shown the
 * workout, and sounded perfectly confident doing it.
 */
const MAX_CONTEXT_CHARS = 16000;

/**
 * The week of food is by far the longest section, so it is the one
 * that gets shortened when something has to give. Trimming days off
 * the end is visible in the text; slicing the whole context is not,
 * and it silently takes the training and notes with it.
 */
const MAX_WEEK_CHARS = 11000;

/** Hard ceiling on one question. */
export const MAX_QUESTION_CHARS = 400;

export type CoachTurn = { role: "user" | "assistant"; text: string };

const SYSTEM_PROMPT = `You are Zenith, a friendly Indian nutrition and fitness coach, answering questions about one specific plan that has already been made for the person you are talking to.

If someone asks who or what you are, say you are Zenith, the coach built into this planner, and that you can see their plan. Do not claim to be a doctor, a dietitian, or a person.

The plan is given to you in full. Read it and answer from it.

WHAT YOU ARE FOR

Questions about this plan. "Can I swap Tuesday's lunch?" "Why is my target only 1400 calories?" "What can I have instead of paneer?" "Is this workout too much for a beginner?" "I don't have a gym, what do I do?" Answer these properly and specifically, using the actual dishes, numbers and sessions in the plan in front of you.

RULES

1. THE NUMBERS ARE ALREADY CALCULATED. Calories, protein, BMR, TDEE and the safety limits were worked out in code before you saw them. Read them out, explain where they come from, say what they mean. Never recalculate one, never estimate a new one, and never contradict them. If someone asks for a target you have not been given, say it is not in this plan rather than inventing it.

2. SUGGEST SWAPS FREELY, WITH THE PORTION AND THE WEIGHT. Same style as the plan itself: "1 katori rajma (250 g)", "2 roti (70 g atta)". Keep a swap near the calories and protein of the meal it replaces, and say roughly what it comes to. Indian home food, the way the plan is written — not quinoa, not protein bars.

3. BE SHORT. Two or three sentences for most questions. A list only when the answer genuinely is a list, and then no more than four items. Nobody wants an essay about their dinner.

4. YOU ARE NOT A DOCTOR, AND THIS IS THE ONE RULE YOU DO NOT BEND. If a question involves a medical condition (diabetes, thyroid, PCOS, blood pressure, cholesterol, kidney or liver problems), pregnancy or breastfeeding, medication or supplements beyond ordinary food, an eating disorder, symptoms someone is worried about, or feeding a child under 13 — say plainly that this plan was not built for that and they should ask a doctor or a registered dietitian who knows their history. You may still answer the ordinary food part of the question if there is one. Never guess at a medical answer, never suggest a dose, and never reassure someone that a symptom is nothing.

5. NEVER ENCOURAGE EATING LESS THAN THE PLAN SAYS. The calorie floor in it is there on purpose. If someone wants to cut harder, lose weight faster, skip meals, or fast beyond what the plan already includes, tell them the target is set where it is for a reason and that going under it is how people lose muscle and give up. Be kind about it — someone asking that is usually frustrated, not reckless.

6. STAY ON THIS PLAN. If asked something unrelated to food, training or this person's plan, say that is not what you are here for and offer to help with the plan instead. One short sentence, no lecture.

7. MATCH THEIR LANGUAGE. Answer in whatever they wrote to you in — English, Hindi, or the mix of both most people actually type. Keep it warm and plain either way, like a person who knows their food rather than a textbook.

8. IF THE PLAN DOES NOT SAY, SAY SO. You can see the whole plan. If someone asks about something that is not in it, tell them it is not there rather than filling the gap with a guess.

9. PLAIN TEXT ONLY. No markdown of any kind — no asterisks for bold, no hashes, no backticks, no bullet characters. Your answer is shown in a chat bubble exactly as you write it, so a line like **paneer** appears with the asterisks still on it. If you need a list, write each item on its own line starting with a dash.`;

/**
 * The plan, flattened into something a model can read.
 *
 * Compact on purpose: this is re-sent with every question, so each
 * line costs on every turn rather than once.
 */
export function planContext(plan: MealPlan, nutrition: NutritionPlan): string {
  const parts: string[] = [];

  parts.push(
    `THEIR NUMBERS (calculated in code — fixed)
- Daily calories: ${nutrition.calories} kcal
- Protein: ${nutrition.macros.proteinG} g, carbs: ${nutrition.macros.carbsG} g, fat: ${nutrition.macros.fatG} g
- BMR: ${nutrition.bmr} kcal (${nutrition.bmrSource === "measured" ? "measured, they gave us this" : "estimated with Mifflin-St Jeor"})
- TDEE: ${nutrition.tdee} kcal
- BMI: ${nutrition.bmi} (${nutrition.bmiCategory})
- Healthy weight range: ${nutrition.healthyWeightRange.min}–${nutrition.healthyWeightRange.max} kg
- Expected change: ${nutrition.weeklyChangeKg} kg a week${
      nutrition.clampedToFloor
        ? "\n- NOTE: this target was raised to the clinical minimum. It cannot go lower."
        : ""
    }`,
  );

  if (nutrition.warnings.length > 0) {
    parts.push(`WARNINGS ALREADY SHOWN TO THEM\n${nutrition.warnings.map((w) => `- ${w}`).join("\n")}`);
  }

  if (plan.days.length > 0) {
    /*
     * Whole days, not a character slice. Half a Thursday is worse than
     * no Thursday — the model would answer about a dinner it could
     * only see the first few words of.
     */
    const rendered = plan.days.map(
      (day) =>
        `${day.day} (${day.calories} kcal, ${day.proteinG} g protein)\n${day.meals
          .map((meal) => `  ${meal.slot}: ${meal.items.join(", ")} — ${meal.calories} kcal, ${meal.proteinG} g protein. Swap: ${meal.swap}`)
          .join("\n")}`,
    );

    const kept: string[] = [];
    let used = 0;
    for (const day of rendered) {
      if (used + day.length > MAX_WEEK_CHARS) break;
      kept.push(day);
      used += day.length + 1;
    }

    const dropped = rendered.length - kept.length;
    parts.push(
      `THEIR WEEK OF FOOD\n${kept.join("\n")}${
        dropped > 0
          ? `\n\n[The last ${dropped} day${dropped === 1 ? "" : "s"} of this week are not shown to you. If asked about them, say you cannot see those days rather than guessing.]`
          : ""
      }`,
    );
  }

  if (plan.workout.length > 0) {
    const training = plan.workout
      .map((day) =>
        day.rest
          ? `${day.day}: rest — ${day.focus}`
          : `${day.day}: ${day.focus}\n${day.blocks
              .map((block) => `  ${block.name}: ${block.items.join("; ")}`)
              .join("\n")}`,
      )
      .join("\n");
    parts.push(`THEIR TRAINING WEEK\n${training}`);
  }

  if (plan.notes.length > 0) {
    parts.push(`NOTES ON THE PLAN\n${plan.notes.map((n) => `- ${n}`).join("\n")}`);
  }

  const context = parts.join("\n\n");
  return context.length > MAX_CONTEXT_CHARS
    ? `${context.slice(0, MAX_CONTEXT_CHARS)}\n\n[plan truncated]`
    : context;
}

export type CoachUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type CoachAnswer = {
  text: string;
  usage: CoachUsage;
};

export async function askCoach(
  question: string,
  context: string,
  history: CoachTurn[],
): Promise<CoachAnswer> {
  const client = new Anthropic();

  /*
   * The plan rides on the first user turn rather than in the system
   * prompt. Keeping the system prompt free of user data is what lets
   * it stay identical between people, and the model reads it the same
   * either way.
   */
  const recent = history.slice(-HISTORY_LIMIT);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the plan I am asking about.\n\n${context}`,
      },
      {
        role: "assistant",
        content: "Got it — I have your plan in front of me. What would you like to know?",
      },
      ...recent.map((turn) => ({
        role: turn.role,
        content: turn.text,
      })),
      { role: "user", content: question },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

  if (!text) {
    throw new Error("Coach returned no text");
  }

  return {
    text,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/** Rough rupee cost of one answer, for the usage log. Haiku 4.5: $1/M in, $5/M out. */
export function estimateCoachCostInr(usage: CoachUsage, usdToInr = 90): number {
  const inputUsd = (usage.inputTokens / 1_000_000) * 1;
  const outputUsd = (usage.outputTokens / 1_000_000) * 5;
  return (inputUsd + outputUsd) * usdToInr;
}
