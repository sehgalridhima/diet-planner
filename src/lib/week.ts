import {
  DAYS,
  MEAL_SLOTS,
  MEAL_SPLIT,
  PROTEIN_SPLIT,
  type DayPlan,
  type Dish,
  type Meal,
  type MealPool,
  type MealSlot,
} from "@/lib/plan-types";

/* ===============================================================
   WEEK ASSEMBLY — shared by both engines
   ===============================================================
   Given a pool of candidate dishes per slot, build seven days that
   each land near the calorie and protein targets while being
   different from one another.

   This is deliberately the same code for the built-in table and for
   Claude's pool. The engines differ in where the dishes come from;
   how a week is put together should not vary with the engine, or
   two users would get structurally different products.
   =============================================================== */

/** Scales a dish's staple toward the calorie target and reports the result. */
function scaleDish(dish: Dish, targetCalories: number) {
  const items = [...dish.items];
  let calories = dish.calories;
  let proteinG = dish.proteinG;

  if (dish.scale) {
    for (let n = 1; n <= dish.scale.max; n++) {
      const next = calories + dish.scale.calories;
      if (Math.abs(next - targetCalories) >= Math.abs(calories - targetCalories)) break;
      calories = next;
      proteinG += dish.scale.proteinG;
      items.push(`+ 1 ${dish.scale.unit}`);
    }
  }

  return { items, calories, proteinG };
}

/**
 * Scores how well a dish fits one meal's targets. Lower is better.
 *
 * Missing the protein target is penalised twice as hard as missing
 * calories, because protein is the number people actually fail to hit —
 * especially on vegetarian plans, where the calorie-cheapest option is
 * almost never the protein-adequate one.
 */
function scoreDish(dish: Dish, targetCalories: number, targetProtein: number) {
  const scaled = scaleDish(dish, targetCalories);
  const calorieGap = scaled.calories - targetCalories;

  // Going over is worse than going under. On a fat-loss plan a ten percent
  // overshoot can halve the deficit, while landing slightly under costs
  // almost nothing.
  const calorieWeight = calorieGap > 0 ? 2.5 : 1;
  const caloriePenalty = (Math.abs(calorieGap) / targetCalories) * calorieWeight;
  const proteinPenalty = (Math.max(0, targetProtein - scaled.proteinG) / targetProtein) * 2;

  /*
   * Some extra protein is welcome, but overshoot is not free: calories
   * are fixed, so protein taken past the target comes out of the carbs
   * and fat on the same plate. A week that landed 92–123 g against a
   * 99 g target put one day at 35% of its calories from protein — the
   * exact density the target's cap exists to keep off the plate, and
   * the kind of day people describe as not really a meal.
   *
   * A fifth over is the allowance. Tightening it to a tenth was tried
   * and made things worse, not better: with a thin pool the scorer
   * simply reached further down the list, and the worst day went from
   * 7% under target to 11% under. The fix for an uneven week is more
   * dishes to choose from, not a stricter rule applied to too few.
   */
  const proteinExcess = Math.max(0, scaled.proteinG - targetProtein * 1.2) / targetProtein;

  return { scaled, score: caloriePenalty + proteinPenalty + proteinExcess * 0.6 };
}

/**
 * The dishes this slot will rotate through, best fit first.
 *
 * Capped at seven: beyond one dish per day there is nothing to gain, and
 * taking the whole list would drag genuinely poor fits into the week just
 * for the sake of variety.
 */
function rotationFor(
  dishes: Dish[],
  targetCalories: number,
  targetProtein: number,
  wanted: string[] = [],
) {
  return dishes
    .map((dish) => {
      const scored = scoreDish(dish, targetCalories, targetProtein);
      // A craving is worth about as much as a moderate calorie miss:
      // enough to promote a dish, never enough to promote a bad fit.
      const text = dish.items.join(" ").toLowerCase();
      const wants = wanted.some((w) => text.includes(w));
      return { ...scored, score: scored.score - (wants ? 0.35 : 0) };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, DAYS.length);
}

/**
 * Builds seven days from the pool.
 *
 * Each slot rotates independently through its own ranked list, so
 * breakfast changing on Tuesday does not force dinner to change with it.
 * The offset is the day index, which means the week is deterministic —
 * the same inputs give the same week, every time, and can be cached.
 */
export function assembleWeek(
  pool: MealPool,
  dailyCalories: number,
  dailyProteinG: number,
  /**
   * Something the person said they want to eat. Dishes mentioning it are
   * pulled toward the front of the rotation rather than forced in — a
   * craving should tilt the week, not override the targets.
   */
  craving = "",
): DayPlan[] {
  const rotations = {} as Record<MealSlot, ReturnType<typeof rotationFor>>;

  const wanted = craving
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 3);

  for (const slot of MEAL_SLOTS) {
    rotations[slot] = rotationFor(
      pool[slot] ?? [],
      Math.round(dailyCalories * MEAL_SPLIT[slot]),
      // Protein has its own split — see PROTEIN_SPLIT.
      Math.round(dailyProteinG * PROTEIN_SPLIT[slot]),
      wanted,
    );
  }

  const days = DAYS.map((day, dayIndex) => {
    const meals: Meal[] = [];

    MEAL_SLOTS.forEach((slot, slotIndex) => {
      const rotation = rotations[slot];
      if (rotation.length === 0) return;

      /*
       * Alternate slots run the rotation backwards.
       *
       * The rotation is ranked best fit first, so walking every slot
       * forwards would give Monday the best dish in all four slots and
       * Sunday the worst in all four — a week that starts on target and
       * drifts badly under it by the weekend. Counter-rotating pairs a
       * weaker breakfast with a stronger dinner, which keeps each day's
       * totals close to the target instead of the week's average being
       * right while no individual day is.
       */
      const length = rotation.length;
      const position =
        slotIndex % 2 === 0
          ? dayIndex % length
          : (length - 1 - (dayIndex % length) + length) % length;

      const pick = rotation[position];

      // The swap is the next dish in the rotation, so it is a real
      // alternative rather than whatever happened to be next in the list.
      // With only one dish available there is nothing honest to offer.
      const alternative = length > 1 ? rotation[(position + 1) % length] : null;

      meals.push({
        slot,
        items: pick.scaled.items,
        calories: Math.round(pick.scaled.calories),
        proteinG: Math.round(pick.scaled.proteinG),
        swap: alternative ? alternative.scaled.items.join(", ") : "",
      });
    });

    return {
      day,
      meals,
      calories: meals.reduce((sum, m) => sum + m.calories, 0),
      proteinG: meals.reduce((sum, m) => sum + m.proteinG, 0),
    };
  });

  return levelProtein(days, dailyProteinG);
}

/**
 * Evens out protein across the week by trading whole meals between days.
 *
 * Each slot is picked against its own share with no view of the day it
 * lands in, so a day can collect the highest-protein dish in all four
 * slots at once. Counter-rotation spreads dishes across the week but
 * cannot see a day's total either. One vegan week came out at 94–127 g
 * against a 99 g target, and the 127 g day drew 36% of its calories
 * from protein — the density the target's own cap exists to prevent.
 *
 * The correction is an EXCHANGE, not a substitution. The rotation holds
 * exactly seven dishes for seven days, so replacing one day's lunch with
 * a different dish necessarily uses that dish twice and costs the week a
 * distinct meal — which is what the first attempt at this did, quietly
 * dropping variety from 7 dishes to 6. Swapping the same slot between a
 * heavy day and a light one moves protein without touching which dishes
 * appear at all.
 *
 * Bounded and greedy: each pass makes the single trade that most reduces
 * the gap, and it stops as soon as no trade helps.
 */
function levelProtein(days: DayPlan[], target: number): DayPlan[] {
  const total = (day: DayPlan) => day.meals.reduce((sum, m) => sum + m.proteinG, 0);
  const cost = (list: DayPlan[]) =>
    list.reduce((worst, day) => Math.max(worst, Math.abs(total(day) - target)), 0);

  for (let pass = 0; pass < MEAL_SLOTS.length * DAYS.length; pass++) {
    let best: { a: number; b: number; slot: number; cost: number } | null = null;

    for (let a = 0; a < days.length; a++) {
      for (let b = a + 1; b < days.length; b++) {
        for (let slot = 0; slot < days[a].meals.length; slot++) {
          if (days[b].meals[slot]?.slot !== days[a].meals[slot]?.slot) continue;

          const trial = days.map((day) => ({ ...day, meals: [...day.meals] }));
          const held = trial[a].meals[slot];
          trial[a].meals[slot] = trial[b].meals[slot];
          trial[b].meals[slot] = held;

          const after = cost(trial);
          if (after < (best?.cost ?? cost(days))) {
            best = { a, b, slot, cost: after };
          }
        }
      }
    }

    if (!best) break;

    const held = days[best.a].meals[best.slot];
    days[best.a].meals[best.slot] = days[best.b].meals[best.slot];
    days[best.b].meals[best.slot] = held;
  }

  // Totals were computed before any trade, so they have to be redone.
  return days.map((day) => ({
    ...day,
    calories: day.meals.reduce((sum, m) => sum + m.calories, 0),
    proteinG: day.meals.reduce((sum, m) => sum + m.proteinG, 0),
  }));
}

/** How many distinct dishes the week actually used, per slot. */
export function varietyReport(days: DayPlan[]): Record<string, number> {
  const seen: Record<string, Set<string>> = {};

  for (const day of days) {
    for (const meal of day.meals) {
      seen[meal.slot] ??= new Set();
      seen[meal.slot].add(meal.items.join("|"));
    }
  }

  return Object.fromEntries(Object.entries(seen).map(([slot, set]) => [slot, set.size]));
}
