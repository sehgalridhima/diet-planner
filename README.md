# Eloquence

An Indian diet and workout planner.

Works out your calorie and protein targets, then fills them with food an Indian kitchen actually has — dal, roti, sabzi, curd, paneer — in portions you can picture rather than grams you have to weigh.

## Why this exists

Most diet plans fail for a boring reason: they tell you to eat quinoa and salmon on a Tuesday. The plan is not wrong, it is just unfollowable. This one starts from the same arithmetic every plan uses, and then only suggests food you would plausibly cook.

## How it works

There are two halves, deliberately separated.

**The numbers are calculated, never generated.** BMR comes from the Mifflin-St Jeor equation, scaled by activity to TDEE, adjusted for the goal, then clamped to safe limits. That lives in `src/lib/nutrition.ts` and is pure arithmetic — the same inputs always produce the same targets. Calorie advice is not something to leave to a language model.

**The food is chosen, not calculated.** Claude receives the finished targets and picks meals that fit them. It cannot change the numbers; it only answers "what should this person eat to hit them". That lives in `src/lib/ai-planner.ts`.

Claude returns a *pool* of seven options per meal slot, not a finished week. `src/lib/week.ts` decides which dish lands on which day, scales portions toward the calorie target, and has days trade meals with each other until every one of the seven lands on its protein target — rather than the week's average being right while no individual day is.

The training plan never goes near the model at all. `src/lib/workout-planner.ts` builds it from a table of exercises tagged by equipment and joint impact, so that path costs nothing.

**Zenith** (`src/lib/coach.ts`) is a coach you can ask about the plan on screen. It is handed your actual week, so it answers things a general chatbot cannot — swap Tuesday's lunch, why your target is that number, what to eat instead of paneer. It runs on a cheaper model than the planner, and is under the same rule as everything else here: it reads the calculated numbers and explains them, and is forbidden from working one out.

If there is no API key, or the call fails, `src/lib/builtin-planner.ts` assembles a plan from a food table instead. It is free, needs no account, and the app never shows a dead end.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. It works immediately, using the built-in planner.

To enable AI-generated meals:

```bash
cp .env.local.example .env.local
# paste your key into .env.local
```

Get a key at [console.anthropic.com](https://console.anthropic.com) → API Keys. The account needs credits before any request will work.

`.env.local` is gitignored and never reaches GitHub.

## Keeping API costs down

Four things, all in code rather than left to discipline:

| | |
| --- | --- |
| **Prompt caching** | The system prompt is identical on every request and marked cacheable, so after the first call its input tokens bill at roughly a tenth of the normal rate. |
| **Result caching** | Inputs are rounded before becoming the cache key, so people with similar bodies and the same goal share a plan instead of each paying for one. |
| **Low effort, schema-constrained output** | Choosing meals off a target is not a reasoning problem, so the model runs at low effort and returns only the fields the page renders. It cannot pad the response with prose. |
| **Rate limiting** | Five fresh plans per IP per hour. Past that, the built-in planner answers. |
| **A daily site budget** | Eight fresh plans and forty Zenith answers a day, across everyone. |

The two limits guard different things and both are worth having. The per-IP one is a `Map` in module scope — each serverless instance keeps its own, so someone determined gets more than five. It stops one person hammering the form, which is all it was ever able to do.

The daily one is the ceiling it could not be: Postgres, where the increment and the check happen in one atomic statement (`src/lib/budget.ts`, `supabase/migrations/0003_ai_budget.sql`). The limits live in the migration rather than the app, because the anon key is public and a limit you can pass as an argument is not a limit. It holds one count per day per kind and nothing else — no profile, no user id, nothing from the tables that RLS protects.

The claim happens where the model is actually called, not at the route, because the cache is read first and a workout-only request never reaches the model. Spending the day's budget on a plan that costs nothing to serve would make the count a lie.

When the plan budget runs out the built-in planner answers instead, so a plan still comes back and the numbers are identical — they are worked out in code either way. Zenith has nothing to fall back to, so it says so.

Underneath all of it: **the Anthropic balance with auto-reload off.** Spending cannot exceed what has been paid for, so the worst case is not a bill — it is Eloquence going quiet, along with Lead Scout and Money Reader, because all three spend the same balance.

Zenith is metered separately: five questions per IP per hour, a small model, short answers, and trimmed history. Measured rather than estimated — about ₹0.53 a question with a plan attached and ₹0.17 without. `scripts/measure-coach.mts` prints the real figure on demand; it spends credit, so it is not part of the checks.

Every AI call logs its token usage and an approximate rupee cost to the server console, so the bill is never a surprise.

## Checking the numbers

```bash
npm run check:nutrition
```

Prints BMR, TDEE, targets, macros and warnings for a set of test profiles. Worth re-running after any change to `nutrition.ts` — it is the file where a mistake would matter most.

```bash
npm run check:plan
```

105 assertions over the food table, the exercise table, the week assembly, the shopping list and the recipes. They exist because each one is a bug that actually shipped: a diet quietly losing options, dairy tagged vegan, an exercise prescribed to someone with no equipment for it, an ingredient dropped from the shopping list, and a week that promised a protein target its food never delivered.

## What it does not do

- It is not medical advice, and says so on every result.
- It refuses to recommend below 1200 kcal for women or 1500 for men, caps weight loss at roughly 0.75 kg a week, and warns rather than complies when someone underweight asks to lose more.
- The shopping list counts portions, not recipes. It cannot decompose "palak paneer" into spinach and onion, and the page says so — a list that quietly under-reports is worse than no list.
- Zenith is not a doctor and will not pretend otherwise. Anything involving a medical condition, medication or pregnancy gets pointed at a real one.
