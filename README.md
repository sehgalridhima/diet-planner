# Indian Diet & Workout Planner

Works out your calorie and protein targets, then fills them with food an Indian kitchen actually has — dal, roti, sabzi, curd, paneer — in portions you can picture rather than grams you have to weigh.

## Why this exists

Most diet plans fail for a boring reason: they tell you to eat quinoa and salmon on a Tuesday. The plan is not wrong, it is just unfollowable. This one starts from the same arithmetic every plan uses, and then only suggests food you would plausibly cook.

## How it works

There are two halves, deliberately separated.

**The numbers are calculated, never generated.** BMR comes from the Mifflin-St Jeor equation, scaled by activity to TDEE, adjusted for the goal, then clamped to safe limits. That lives in `src/lib/nutrition.ts` and is pure arithmetic — the same inputs always produce the same targets. Calorie advice is not something to leave to a language model.

**The food is chosen, not calculated.** Claude receives the finished targets and picks meals that fit them. It cannot change the numbers; it only answers "what should this person eat to hit them". That lives in `src/lib/ai-planner.ts`.

If there is no API key, or the call fails, `src/lib/builtin-planner.ts` assembles a plan from a small food table instead. It is free, needs no account, and the app never shows a dead end.

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

The one guard that is not in this repo, and matters most: **set a spend limit in the Anthropic console.** Rate limiting is best-effort — on serverless, each instance keeps its own counter.

Every AI call logs its token usage and an approximate rupee cost to the server console, so the bill is never a surprise.

## Checking the numbers

```bash
npm run check:nutrition
```

Prints BMR, TDEE, targets, macros and warnings for a set of test profiles. Worth re-running after any change to `nutrition.ts` — it is the file where a mistake would matter most.

## What it does not do

- It is not medical advice, and says so on every result.
- It refuses to recommend below 1200 kcal for women or 1500 for men, caps weight loss at roughly 0.75 kg a week, and warns rather than complies when someone underweight asks to lose more.
- It plans one day, not seven. Eating the same day repeatedly is fine nutritionally and boring in practice; varied weekly plans are the obvious next step.
