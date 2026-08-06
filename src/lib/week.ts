import {
  DAYS,
  MEAL_SLOTS,
  MEAL_SPLIT,
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

  // Some extra protein is welcome, but chasing it past about a fifth over
  // target only buys calories — so beyond that, overshoot starts to cost.
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
function rotationFor(dishes: Dish[], targetCalories: number, targetProtein: number) {
  return dishes
    .map((dish) => scoreDish(dish, targetCalories, targetProtein))
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
): DayPlan[] {
  const rotations = {} as Record<MealSlot, ReturnType<typeof rotationFor>>;

  for (const slot of MEAL_SLOTS) {
    rotations[slot] = rotationFor(
      pool[slot] ?? [],
      Math.round(dailyCalories * MEAL_SPLIT[slot]),
      Math.round(dailyProteinG * MEAL_SPLIT[slot]),
    );
  }

  return DAYS.map((day, dayIndex) => {
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
