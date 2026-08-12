import fs from "node:fs";
import { askCoach, planContext, estimateCoachCostInr } from "@/lib/coach";

/* ===============================================================
   MEASURE COACH — what a conversation actually costs
   ===============================================================
   THIS SPENDS REAL CREDIT. It is not part of `npm run check` and
   nothing runs it automatically. Run it by hand after changing the
   system prompt or the plan context, because both are re-sent with
   every question and neither announces when it has grown.

     npx tsx scripts/measure-coach.mts plan.json

   where plan.json is a response from /api/plan.

   It exists because the context cap was once set below the size of
   a real plan, which silently cut the training week and the notes
   off the end. Nothing failed, nothing logged, and the coach went
   on answering questions about a workout it had never been shown.
   A number printed here would have caught it on the first run.
   =============================================================== */

const path = process.argv[2];
if (!path) {
  console.error("Usage: npx tsx scripts/measure-coach.mts <plan.json>");
  process.exit(1);
}

const d = JSON.parse(fs.readFileSync(path, "utf8"));
const ctx = planContext(d.plan, d.nutrition);
console.log(`plan context: ${ctx.length} chars`);
if (ctx.includes("are not shown to you")) {
  console.log("⚠️  days were dropped — the week is over the cap");
}

const questions = [
  "Why is my calorie target this number?",
  "Can I swap Wednesday's dinner?",
  "What's my highest protein breakfast?",
  "I don't have dumbbells, is the workout still fine?",
  "Kya main Sunday ko cheat meal le sakti hoon?",
];

let total = 0;
const history: { role: "user" | "assistant"; text: string }[] = [];

for (const question of questions) {
  const answer = await askCoach(question, ctx, history);
  history.push({ role: "user", text: question }, { role: "assistant", text: answer.text });
  const inr = estimateCoachCostInr(answer.usage);
  total += inr;
  console.log(
    `in ${answer.usage.inputTokens}  out ${answer.usage.outputTokens}  ->  Rs ${inr.toFixed(2)}`,
  );
}

console.log(`\nOne visitor using all ${questions.length} questions: Rs ${total.toFixed(2)}`);
