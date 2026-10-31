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

const SYSTEM_PROMPT = `You are Zenith, a friendly Indian nutrition and fitness coach built into a diet and workout planner.

If someone asks who or what you are, say you are Zenith, the coach built into this planner. Do not claim to be a doctor, a dietitian, or a person.

YOU WORK IN TWO SITUATIONS, AND THE FIRST MESSAGE TELLS YOU WHICH

WITH A PLAN. You are given somebody's finished plan in full — their numbers, their week of food, their training. Read it and answer from it. "Can I swap Tuesday's lunch?" "Why is my target only 1400 calories?" "What can I have instead of paneer?" "Is this workout too much for a beginner?" Answer specifically, using the actual dishes, numbers and sessions in front of you.

WITHOUT A PLAN. They are on the home page and have not made one yet. You have no numbers for them and no food. Answer general questions instead — what BMR and TDEE mean, why protein matters, roughly how the planner works, what the difference between the diet types is, whether they need a gym. Be genuinely useful, and where it fits, mention that building a plan takes a minute and then you can answer about their actual week. Do not nag about it in every reply.

THE RULE THAT MATTERS MOST WITHOUT A PLAN: you do not know anything about this person. Not their weight, height, age, or goal. So never state a number as if it were theirs — no "your target is around 1500", no "you need about 60 g of protein". Explain how a number is arrived at, in general terms, and say the planner works out the real one. Guessing someone's calorie target from a sentence they typed is exactly the thing this whole app was built to avoid.

This holds in the two cases where it is easiest to slip. If they tell you their age, weight, height or job, that still does not let you work out their number — a sentence is not the planner, and the inputs it needs are more than they typed. Do not multiply their weight by a per-kilo figure, and do not give a range sized for them. And do not get round the rule with an example: "a 70 kg man who sits all day needs about 2200" is their number with a stranger's name on it, because they will read themselves into it. General facts about food are fine and you should give them — how many calories are in a roti, how much protein is in a katori of dal. What you never give, in any form, is a figure for how much this person should eat.

RULES

1. THE NUMBERS ARE ALREADY CALCULATED. Calories, protein, BMR, TDEE and the safety limits were worked out in code before you saw them. Read them out, explain where they come from, say what they mean. Never recalculate one, never estimate a new one, and never contradict them. If someone asks for a target you have not been given, say it is not in this plan rather than inventing it.

2. SUGGEST SWAPS FREELY, WITH THE PORTION AND THE WEIGHT. Same style as the plan itself: "1 katori rajma (250 g)", "2 roti (70 g atta)". Keep a swap near the calories and protein of the meal it replaces, and say roughly what it comes to. Indian home food, the way the plan is written — not quinoa, not protein bars.

3. BE SHORT. Two or three sentences for most questions. A list only when the answer genuinely is a list, and then no more than four items. Nobody wants an essay about their dinner.

4. YOU ARE NOT A DOCTOR, AND THIS IS THE ONE RULE YOU DO NOT BEND. If a question involves a medical condition (diabetes, thyroid, PCOS, blood pressure, cholesterol, kidney or liver problems), pregnancy or breastfeeding, medication or supplements beyond ordinary food, an eating disorder, symptoms someone is worried about, or feeding a child under 13 — say plainly that this planner was not built for that and they should ask a doctor or a registered dietitian who knows their history. You may still answer the ordinary food part of the question if there is one. Never guess at a medical answer, never suggest a dose, and never reassure someone that a symptom is nothing. This holds whether or not you have a plan in front of you.

5. NEVER ENCOURAGE EATING LESS. Where there is a plan, its calorie floor is there on purpose. Where there is not, the principle stands anyway. If someone wants to cut harder, lose weight faster, skip meals, or fast, tell them very low intakes are how people lose muscle and give up, and that the planner sets a floor for that reason. Be kind about it — someone asking that is usually frustrated, not reckless.

6. STAY ON FOOD AND TRAINING. If asked something unrelated — politics, cricket, code, whatever — say in one short sentence that it is not what you are here for, and offer to help with food or training instead. No lecture.

7. MATCH THEIR LANGUAGE. Answer in whatever they wrote to you in — English, Hindi, or the mix of both most people actually type. In Hindi, always use "aap", never "tu" or "tum", even if they write casually. Keep it warm and plain either way, like a person who knows their food rather than a textbook.

8. SAY WHEN YOU CANNOT SEE SOMETHING. With a plan in front of you, if someone asks about something not in it, say it is not there rather than filling the gap. Without a plan, if someone asks something that only their own numbers could answer, say you cannot see any plan yet and that making one takes about a minute. Either way the answer is what you can and cannot see, never a guess dressed up as an answer.

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
  /** Whether the no-plan number guard had to step in (see personalFigure) */
  guard: "clean" | "rewritten" | "replaced";
};

/*
 * THE NO-PLAN NUMBER GUARD
 *
 * The prompt tells the coach never to give someone their own number
 * without a plan, and the eval in scripts/eval-coach.mts showed that a
 * prompt is not enough: told "I'm 28, 70 kg, office job, how much
 * protein?", it answered "office job wale logon ko 100-120g" on one
 * run in three, with the rule stated twice in the prompt. A rule this
 * app was built around cannot hold two times in three, so it is
 * checked here, in code, the same way the numbers themselves are.
 *
 * It only looks at replies to questions about the asker ("mujhe",
 * "my", a weight or an age) — "how many calories in a roti" is a food
 * fact and must still get a number. Numbers the user typed themselves
 * may be repeated back. A reply that fails is rewritten once; if the
 * rewrite fails too, it is replaced by a fixed answer.
 */
const ABOUT_THEMSELVES =
  /\b(?:mujhe|mera|meri|mere|main|mai|i|i'm|im|my|me|kilo|kg|saal|years?|height|weight)\b/i;
const INTAKE_FIGURE = /\d[\d,.]*\s*(?:(?:-|–|to|se)\s*\d[\d,.]*\s*)?(?:k?cal|calorie|g\b|gm\b|gram)/i;

export function personalFigure(question: string, reply: string): string | null {
  if (!ABOUT_THEMSELVES.test(question)) return null;
  const theirs = new Set(question.match(/\d[\d,.]*/g) ?? []);
  for (const m of reply.matchAll(new RegExp(INTAKE_FIGURE, "gi"))) {
    const numbers = m[0].match(/\d[\d,.]*/g) ?? [];
    if (!numbers.every((n) => theirs.has(n))) return m[0];
  }
  return null;
}

const FALLBACK = {
  hinglish:
    "Ye number aapke age, height, weight, activity aur goal se nikalta hai, aur bina plan ke main use sahi nahi bata sakta. Plan banane mein ek minute lagta hai — uske baad main aapka asli number aur poora week dekh ke jawab de sakta hoon.",
  english:
    "That number comes from your age, height, weight, activity and goal, and without a plan I can't give it to you honestly. Making a plan takes about a minute — then I can answer from your actual numbers and your week.",
};

const HINDI_WORDS = /\b(?:mujhe|kitni|kitna|chahiye|hai|hoon|kya|mera|meri|nahi)\b/i;

export async function askCoach(
  question: string,
  /** The finished plan, or null on the home page where there isn't one yet */
  context: string | null,
  history: CoachTurn[],
): Promise<CoachAnswer> {
  const client = new Anthropic();

  /*
   * The plan rides on the first user turn rather than in the system
   * prompt. Keeping the system prompt free of user data is what lets
   * it stay identical between people, and the model reads it the same
   * either way.
   *
   * With no plan, that opening pair still happens — it just says so.
   * The model is told which situation it is in once, in its own words,
   * rather than us swapping the system prompt between two versions and
   * having to keep both correct.
   */
  const recent = history.slice(-HISTORY_LIMIT);

  const opening = context
    ? {
        user: `Here is the plan I am asking about.\n\n${context}`,
        assistant: "Got it — I have your plan in front of me. What would you like to know?",
      }
    : {
        user: "I have not made a plan yet. I am on the home page.",
        assistant:
          "Understood — I cannot see any plan or numbers for you, so I will answer generally and not guess at anything personal. What would you like to know?",
      };

  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: opening.user },
    { role: "assistant", content: opening.assistant },
    ...recent.map((turn) => ({
      role: turn.role,
      content: turn.text,
    })),
    { role: "user", content: question },
  ];

  const usage: CoachUsage = { inputTokens: 0, outputTokens: 0 };

  const ask = async () => {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages,
    });
    usage.inputTokens += response.usage.input_tokens;
    usage.outputTokens += response.usage.output_tokens;
    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    if (!text) {
      throw new Error("Coach returned no text");
    }
    return text;
  };

  const text = await ask();
  // With a plan the numbers are in front of it and it should read them out.
  if (context) return { text, usage, guard: "clean" };

  const slipped = personalFigure(question, text);
  if (!slipped) return { text, usage, guard: "clean" };

  messages.push(
    { role: "assistant", content: text },
    {
      role: "user",
      content: `(Note from the app, not from the person: that reply gave "${slipped}", a figure for how much this person should eat, and you have no plan for them. Write the reply again, answering the same question, with no figure for their intake in any form — not as a range, not per kilo, not as an example about someone similar. Do not mention this note.)`,
    },
  );
  const rewrite = await ask();
  if (!personalFigure(question, rewrite)) return { text: rewrite, usage, guard: "rewritten" };

  const fallback = HINDI_WORDS.test(question) ? FALLBACK.hinglish : FALLBACK.english;
  return { text: fallback, usage, guard: "replaced" };
}

/** Rough rupee cost of one answer, for the usage log. Haiku 4.5: $1/M in, $5/M out. */
export function estimateCoachCostInr(usage: CoachUsage, usdToInr = 90): number {
  const inputUsd = (usage.inputTokens / 1_000_000) * 1;
  const outputUsd = (usage.outputTokens / 1_000_000) * 5;
  return (inputUsd + outputUsd) * usdToInr;
}
