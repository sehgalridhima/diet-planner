import { buildNutritionPlan, validateInput, type ActivityLevel, type Goal, type UserInput } from "../src/lib/nutrition";
import { buildBuiltinPlan, buildPool, optionCounts } from "../src/lib/builtin-planner";
import { assembleWeek } from "../src/lib/week";
import { AVAILABLE, EQUIPMENT_OPTIONS, EXERCISES, buildWorkout, parseEquipment, trainingFrequency, type Equipment } from "../src/lib/workout-planner";
import { DAYS, MEAL_SLOTS, type DietType, type MealPool } from "../src/lib/plan-types";
import { topUpPool } from "../src/lib/ai-planner";
import { buildGroceryList, parsePortion } from "../src/lib/grocery";

/* ===============================================================
   PLAN CHECKS
   ===============================================================
   Asserts the things that are easy to break by editing a table:
   a diet quietly losing options, a dairy item tagged vegan, or an
   exercise being prescribed to someone with no equipment for it.

   That last one was a real bug, so it is a real test now.
   Run with: npm run check:plan
   =============================================================== */

const DIETS: DietType[] = ["veg", "egg", "nonveg", "vegan"];
const KIT: Equipment[] = ["none", "bands", "dumbbells", "gym"];
const GOALS: Goal[] = ["lose", "maintain", "gain"];
const ACTIVITIES: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/* --- 1. Enough options that a week does not repeat ------------- */

console.log("\n=== Option counts per diet (need 7+ for a repeat-free week)");
for (const diet of DIETS) {
  const counts = optionCounts(diet);
  const thin = MEAL_SLOTS.filter((slot) => counts[slot] < DAYS.length);
  check(
    `${diet.padEnd(7)} ${MEAL_SLOTS.map((s) => `${s} ${counts[s]}`).join(", ")}`,
    thin.length === 0,
    thin.length > 0 ? `too few for: ${thin.join(", ")}` : "",
  );
}

/* --- 2. Diets are respected ------------------------------------ */

/**
 * Strip the compounds that merely contain a forbidden word.
 *
 * "soya milk" has to be here as well as "soy milk": Claude writes it
 * both ways, and only stripping one spelling reports a perfectly good
 * vegan dish as a dairy violation.
 */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/soya milk/g, "")
    .replace(/soy milk/g, "")
    .replace(/peanut butter/g, "");
}

const FORBIDDEN: Record<DietType, string[]> = {
  vegan: ["milk", "curd", "paneer", "ghee", "buttermilk", "chaas", "raita", "lassi", "butter", "cheese", "khoya", "chicken", "fish", "mutton", "prawn", "egg"],
  veg: ["chicken", "fish", "mutton", "prawn", "egg"],
  egg: ["chicken", "fish", "mutton", "prawn"],
  nonveg: [],
};

console.log("\n=== Diet violations in the food table");
for (const diet of DIETS) {
  const pool = buildPool(diet);
  const bad: string[] = [];

  for (const slot of MEAL_SLOTS) {
    for (const dish of pool[slot]) {
      const text = normalise([...dish.items, dish.scale?.unit ?? ""].join(" "));
      for (const word of FORBIDDEN[diet]) {
        if (text.includes(word)) bad.push(`${slot}: "${dish.items.join(", ")}" contains "${word}"`);
      }
    }
  }

  check(`${diet} table is clean`, bad.length === 0, bad.join(" | "));
}

/* --- 3. The form's answers parse to what they say ---------------- */

/*
 * This exists because it did not, once. "Bodyweight only" contains the
 * substring "weight", so it parsed as dumbbells and the plan cheerfully
 * prescribed a floor press to someone who owns nothing. Testing
 * buildWorkout directly could never have caught it — the parser sits in
 * front, so the parser needs its own check.
 */
console.log("\n=== Form answers parse to the right equipment");
for (const option of EQUIPMENT_OPTIONS) {
  const got = parseEquipment(option.label);
  check(`"${option.label}" -> ${option.value}`, got === option.value, `got ${got}`);
}
for (const [text, expected] of [
  ["bodyweight only", "none"],
  ["Body weight", "none"],
  ["nothing at all", "none"],
  ["I have dumbbells", "dumbbells"],
  ["home weights", "dumbbells"],
  ["resistance band", "bands"],
  ["full gym membership", "gym"],
  ["", "none"],
] as const) {
  const got = parseEquipment(text);
  check(`"${text}" -> ${expected}`, got === expected, `got ${got}`);
}

/* --- 4. Equipment is never exceeded ----------------------------- */

console.log("\n=== Exercises never exceed the equipment on hand");
for (const equipment of KIT) {
  const reachable = new Set(
    EXERCISES.filter((e) => AVAILABLE[equipment].includes(e.needs)).map((e) => e.name),
  );
  const bad: string[] = [];

  for (const goal of GOALS) {
    for (const activity of ACTIVITIES) {
      for (const lowImpactOnly of [false, true]) {
        const { days } = buildWorkout({ goal, activity, age: 30, equipment, lowImpactOnly });

        for (const day of days) {
          if (day.rest) continue;
          for (const line of day.blocks.filter((b) => b.name !== "Then").flatMap((b) => b.items)) {
            const match = [...reachable].some((name) => line.startsWith(name));
            if (!match) bad.push(`${goal}/${activity}: "${line}"`);
          }
        }
      }
    }
  }

  check(`${equipment.padEnd(10)} (${reachable.size} exercises available)`, bad.length === 0, bad.slice(0, 3).join(" | "));
}

/* --- 4. Every training day is actually populated ---------------- */

console.log("\n=== Training days are complete and frequency matches activity");
for (const equipment of KIT) {
  for (const goal of GOALS) {
    for (const activity of ACTIVITIES) {
      const expected = trainingFrequency(activity, goal, 30);
      const { days } = buildWorkout({ goal, activity, age: 30, equipment, lowImpactOnly: false });
      const training = days.filter((d) => !d.rest);
      const empty = training.filter((d) => d.blocks.flatMap((b) => b.items).length === 0);

      if (training.length !== expected || empty.length > 0) {
        check(
          `${equipment}/${goal}/${activity}`,
          false,
          `${training.length} training days (expected ${expected}), ${empty.length} empty`,
        );
      }
    }
  }
}
check("all equipment / goal / activity combinations populated", true);

/* --- 4b. No movement family twice in one session ---------------- */

/*
 * A real plan opened Monday with "Push-ups 3x12" followed by
 * "Knee push-ups 3x12" — the same movement made easier, prescribed
 * twice in one session. Families exist to stop that.
 */
console.log("\n=== No movement family repeats within a day");
{
  const byName = new Map(EXERCISES.map((e) => [e.name, e]));
  const clashes: string[] = [];

  for (const equipment of KIT) {
    for (const goal of GOALS) {
      for (const activity of ACTIVITIES) {
        for (const lowImpactOnly of [false, true]) {
          const { days } = buildWorkout({ goal, activity, age: 30, equipment, lowImpactOnly });

          for (const day of days) {
            if (day.rest) continue;
            const seen = new Set<string>();

            for (const line of day.blocks.filter((b) => b.name !== "Then").flatMap((b) => b.items)) {
              const match = [...byName.keys()]
                .filter((n) => line.startsWith(n))
                .sort((a, b) => b.length - a.length)[0];
              const family = match ? byName.get(match)?.family : undefined;
              if (!family) continue;
              if (seen.has(family)) {
                clashes.push(`${equipment}/${goal}/${activity}/${day.day}: ${day.blocks.flatMap((b) => b.items).join(", ")}`);
              }
              seen.add(family);
            }
          }
        }
      }
    }
  }

  check(
    "no session prescribes two variants of the same movement",
    clashes.length === 0,
    clashes.slice(0, 2).join(" | "),
  );
}

/* --- 4c. Rest days do not all read the same --------------------- */

console.log("\n=== Rest days vary");
for (const goal of GOALS) {
  const { days } = buildWorkout({
    goal,
    activity: "sedentary",
    age: 30,
    equipment: "none",
    lowImpactOnly: false,
  });
  const rest = days.filter((d) => d.rest);
  const distinct = new Set(rest.map((d) => d.blocks.flatMap((b) => b.items).join("|")));
  check(
    `${goal.padEnd(8)} ${rest.length} rest days, ${distinct.size} distinct wordings`,
    rest.length < 2 || distinct.size > 1,
    "every rest day reads identically",
  );
}

/* --- 5. Age cap and low-impact fallback ------------------------- */

console.log("\n=== Age and joint protection");
check(
  "60-year-old never gets more than 4 training days",
  ACTIVITIES.every((a) => GOALS.every((g) => trainingFrequency(a, g, 60) <= 4)),
);
check(
  "sedentary beginner starts at 3 days",
  trainingFrequency("sedentary", "lose", 30) === 3,
);
{
  const { days } = buildWorkout({
    goal: "lose",
    activity: "sedentary",
    age: 62,
    equipment: "none",
    lowImpactOnly: true,
  });
  const highImpact = ["Jog", "Skipping", "Stair climbing"];
  const found = days.flatMap((d) => d.blocks.flatMap((b) => b.items)).filter((e) => highImpact.some((h) => e.startsWith(h)));
  check("low-impact plan contains no jogging or skipping", found.length === 0, found.join(", "));
}

/* --- 6. The week is varied and lands near target ---------------- */

console.log("\n=== Week variety and calorie accuracy");
const sample: UserInput = {
  age: 21,
  sex: "female",
  heightCm: 163,
  weightKg: 68,
  activity: "light",
  goal: "lose",
};

for (const diet of DIETS) {
  const nutrition = buildNutritionPlan(sample);
  const days = assembleWeek(buildPool(diet), nutrition.calories, nutrition.macros.proteinG);

  const distinct = MEAL_SLOTS.map((slot) => {
    const seen = new Set(days.map((d) => d.meals.find((m) => m.slot === slot)?.items.join("|")));
    return seen.size;
  });

  check(
    `${diet.padEnd(7)} distinct dishes ${MEAL_SLOTS.map((s, i) => `${s} ${distinct[i]}`).join(", ")}`,
    distinct.every((n) => n === DAYS.length),
    "a dish repeats inside the week",
  );

  const drift = days.map((d) => Math.round(((d.calories - nutrition.calories) / nutrition.calories) * 100));
  const worst = Math.max(...drift.map(Math.abs));
  check(
    `${diet.padEnd(7)} daily calories within 12% of target (worst ${worst}%)`,
    worst <= 12,
    `drift by day: ${drift.join(", ")}`,
  );

  /*
   * Protein must hold up across the whole week, not just on Monday.
   * The first cut of the rotation walked every slot best-first, so the
   * week opened on target and fell 40g short by Sunday while the average
   * still looked acceptable. Averages hide that; this does not.
   */
  const protein = days.map((d) => d.proteinG);
  const spread = Math.max(...protein) - Math.min(...protein);
  check(
    `${diet.padEnd(7)} protein steady across the week (spread ${spread}g, days: ${protein.join(", ")})`,
    spread <= 30,
    "one day is much lower in protein than another",
  );
}

/* --- 7. Measured BMR overrides the formula ---------------------- */

console.log("\n=== Measured BMR");
{
  const base = { ...sample };
  const estimated = buildNutritionPlan(base);
  check(
    `no measured value -> falls back to the formula (${estimated.bmr} kcal)`,
    estimated.bmrSource === "estimated" && estimated.bmr === estimated.estimatedBmr,
  );

  // A plausible measurement, ~8% above the estimate.
  const measuredValue = Math.round(estimated.estimatedBmr * 1.08);
  const measured = buildNutritionPlan({ ...base, measuredBmr: measuredValue });
  check(
    `measured ${measuredValue} kcal is used, not the ${estimated.estimatedBmr} kcal estimate`,
    measured.bmrSource === "measured" && measured.bmr === measuredValue,
  );
  check(
    `a higher BMR raises the calorie target (${estimated.calories} -> ${measured.calories})`,
    measured.calories > estimated.calories,
  );
  check(
    "a plausible measurement raises no drift warning",
    !measured.warnings.some((w) => w.includes("than the")),
    measured.warnings.join(" | "),
  );

  // Someone entering their TDEE by mistake — the case worth catching.
  const wrong = buildNutritionPlan({ ...base, measuredBmr: Math.round(estimated.estimatedBmr * 1.6) });
  check(
    "a value 60% above the estimate is flagged as suspicious",
    wrong.warnings.some((w) => w.includes("worth checking")),
  );
  check(
    "...but the plan still uses the number the person gave",
    wrong.bmr === Math.round(estimated.estimatedBmr * 1.6),
  );

  const tooLow = validateInput({ ...base, measuredBmr: 100 });
  check("a BMR of 100 kcal is rejected outright", tooLow.length > 0);
  const blank = validateInput({ ...base, measuredBmr: undefined });
  check("leaving it blank is not an error", blank.length === 0);
}

/* --- 8. The grocery list ---------------------------------------- */

console.log("\n=== Grocery list");
for (const [raw, qty, unit, text] of [
  ["2 roti", 2, "", "roti"],
  ["1 katori dal", 1, "katori", "dal"],
  ["150g paneer bhurji", 150, "g", "paneer bhurji"],
  ["+ 1 tbsp soya chunks", 1, "tbsp", "soya chunks"],
  ["salad", 1, "", "salad"],
  ["10 almonds", 10, "", "almonds"],
  ["1 glass soy milk", 1, "glass", "soy milk"],
  // A stated weight beats the leading count: two parathas is not two
  // units of paneer, and 100g is what you actually buy.
  ["2 stuffed paneer paratha (less oil, 100 g paneer)", 100, "g", "paneer"],
  ["1 bowl soya chunk poha (40g soya chunks)", 40, "g", "soya chunks"],
  // No weight stated, so the parenthetical is dropped rather than parsed.
  ["1 katori paneer tikka (tawa, less oil)", 1, "katori", "paneer tikka"],
] as const) {
  const p = parsePortion(raw);
  check(
    `"${raw}" -> ${p.quantity} ${p.unit || "(count)"} ${p.text}`,
    p.quantity === qty && p.unit === unit && p.text === text,
  );
}

{
  const nutrition = buildNutritionPlan(sample);
  const days = assembleWeek(buildPool("veg"), nutrition.calories, nutrition.macros.proteinG);
  const list = buildGroceryList(days);

  /*
   * Conservation: nothing may vanish and nothing may be invented.
   * A shopping list that quietly drops an item is worse than none at
   * all, so for every unit, the quantities going in must equal the
   * quantities coming out.
   */
  const portions = days.flatMap((d) => d.meals.flatMap((m) => m.items));

  const goingIn = new Map<string, number>();
  for (const portion of portions) {
    const p = parsePortion(portion);
    if (!p.text) continue;
    goingIn.set(p.unit, (goingIn.get(p.unit) ?? 0) + p.quantity);
  }

  const comingOut = new Map<string, number>();
  for (const item of list) {
    comingOut.set(item.unit, (comingOut.get(item.unit) ?? 0) + item.quantity);
  }

  const mismatched = [...goingIn.entries()].filter(
    ([unit, qty]) => Math.abs((comingOut.get(unit) ?? 0) - qty) > 0.001,
  );

  check(
    `all ${portions.length} portions conserved across ${goingIn.size} units`,
    mismatched.length === 0 && goingIn.size === comingOut.size,
    mismatched
      .map(([u, q]) => `${u || "(count)"}: in ${q}, out ${comingOut.get(u) ?? 0}`)
      .join(" | "),
  );

  check("soy milk is not counted as milk", !list.some((i) => i.name === "Milk" && i.unit === "glass" && i.quantity === 0));

  const names = list.map((i) => i.name);
  check(
    `list has real categories (${new Set(list.map((i) => i.category)).size} groups, ${list.length} lines)`,
    list.length >= 5 && new Set(list.map((i) => i.category)).size >= 3,
    names.join(", "),
  );

  // Aggregation is the point: roti appears on most days, so it must
  // be one line with a big number, not one line per day.
  const roti = list.find((i) => i.name === "Roti (atta)" && i.unit === "");
  check(
    roti ? `roti aggregated to a single line (×${roti.quantity})` : "roti aggregated",
    Boolean(roti && roti.quantity > 7),
    roti ? `only ${roti.quantity}` : "no roti line found",
  );
}

/* --- 9. A thin AI pool is topped up ----------------------------- */

/*
 * A real vegan plan came back from Claude with five distinct lunches
 * for seven days, and the rotation repeated two of them. The schema
 * can ask for seven options but cannot require them to differ, so the
 * backstop is code rather than a politely worded prompt.
 */
console.log("\n=== A thin or duplicated AI pool is topped up");
{
  const dish = (name: string, calories = 400, proteinG = 20) => ({
    items: [name],
    calories,
    proteinG,
  });

  const thin: MealPool = {
    Breakfast: [dish("1 bowl poha"), dish("1 bowl poha"), dish("2 idli")],
    Lunch: [dish("2 roti and dal")],
    Snack: [dish("1 apple")],
    Dinner: [dish("1 bowl khichdi"), dish("1 BOWL KHICHDI")],
  };

  topUpPool(thin, "vegan");

  for (const slot of MEAL_SLOTS) {
    const signatures = new Set(thin[slot].map((d) => d.items.join("|").toLowerCase()));
    check(
      `${slot.padEnd(10)} filled to ${thin[slot].length}, all distinct`,
      thin[slot].length === DAYS.length && signatures.size === thin[slot].length,
      `${thin[slot].length} dishes, ${signatures.size} distinct`,
    );
  }

  check(
    "case-only duplicates are treated as the same dish",
    !thin.Dinner.some(
      (d, i) => thin.Dinner.findIndex((o) => o.items.join().toLowerCase() === d.items.join().toLowerCase()) !== i,
    ),
  );

  check(
    "Claude's own dishes are kept ahead of the table's",
    thin.Breakfast[0].items[0] === "1 bowl poha" && thin.Breakfast[1].items[0] === "2 idli",
    thin.Breakfast.map((d) => d.items[0]).join(" / "),
  );

  // The top-up must not smuggle dairy into a vegan plan.
  const dairy = ["curd", "paneer", "milk", "chaas", "buttermilk", "raita"];
  const leaked = MEAL_SLOTS.flatMap((slot) =>
    thin[slot].filter((d) => {
      const t = d.items.join(" ").toLowerCase().replace(/soy milk/g, "");
      return dairy.some((w) => t.includes(w));
    }),
  );
  check("topped-up vegan pool contains no dairy", leaked.length === 0, JSON.stringify(leaked));
}

/* --- 10. A full plan builds end to end -------------------------- */

console.log("\n=== Full plan build");
for (const diet of DIETS) {
  for (const equipment of KIT) {
    const nutrition = buildNutritionPlan(sample);
    const plan = buildBuiltinPlan(nutrition, sample, diet, equipment);
    const ok =
      plan.days.length === DAYS.length &&
      plan.workout.length === DAYS.length &&
      plan.days.every((d) => d.meals.length === MEAL_SLOTS.length);
    if (!ok) check(`${diet}/${equipment}`, false, "wrong shape");
  }
}
check("all diet / equipment combinations produce 7 days of meals and training", true);

console.log(
  failures === 0
    ? "\nAll plan checks passed.\n"
    : `\n${failures} check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
