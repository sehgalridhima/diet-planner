import { MEAL_SPLIT, type DietType, type Meal, type MealPlan, type MealSlot } from "@/lib/plan-types";
import type { Goal, NutritionPlan } from "@/lib/nutrition";

/* ===============================================================
   BUILT-IN PLANNER — no API, no cost
   ===============================================================
   Assembles a day of Indian meals from a small food table to hit
   the calorie and protein targets the nutrition engine produced.

   It exists for three reasons:
     1. The whole app can be built and tested without spending a
        rupee of API credit.
     2. It is the fallback when the AI call fails or the key is
        missing — the tool never shows a user a dead end.
     3. It is the free mode, for anyone running this without a key.

   Portions are written the way people actually eat, not in grams.
   =============================================================== */

type FoodOption = {
  /** Items at the base portion */
  base: string[];
  calories: number;
  proteinG: number;
  diets: DietType[];
  /** A staple that can be added in whole units to fine-tune calories */
  scale?: { unit: string; calories: number; proteinG: number; max: number };
};

const FOODS: Record<MealSlot, FoodOption[]> = {
  Breakfast: [
    {
      base: ["2 besan chilla", "1 katori curd", "1 tsp green chutney"],
      calories: 340,
      proteinG: 18,
      diets: ["veg", "egg", "nonveg"],
      scale: { unit: "besan chilla", calories: 110, proteinG: 6, max: 4 },
    },
    {
      base: ["3 egg whites + 1 whole egg bhurji", "2 multigrain toast"],
      calories: 380,
      proteinG: 26,
      diets: ["egg", "nonveg"],
      scale: { unit: "egg white", calories: 18, proteinG: 4, max: 6 },
    },
    {
      base: ["1 bowl vegetable poha", "1 glass milk"],
      calories: 350,
      proteinG: 12,
      diets: ["veg", "egg", "nonveg"],
      scale: { unit: "tbsp roasted peanuts", calories: 55, proteinG: 3, max: 5 },
    },
    {
      base: ["2 idli", "1 katori sambar", "1 tsp coconut chutney"],
      calories: 300,
      proteinG: 11,
      diets: ["veg", "egg", "nonveg", "vegan"],
      scale: { unit: "idli", calories: 60, proteinG: 2, max: 5 },
    },
    {
      base: ["1 bowl oats cooked in soy milk", "1 tbsp peanut butter", "1 banana"],
      calories: 400,
      proteinG: 15,
      diets: ["veg", "egg", "nonveg", "vegan"],
      scale: { unit: "tbsp oats", calories: 40, proteinG: 1.5, max: 8 },
    },
    {
      base: ["1 bowl moong dal chilla with paneer stuffing", "1 katori curd"],
      calories: 380,
      proteinG: 28,
      diets: ["veg", "egg", "nonveg"],
      scale: { unit: "tbsp paneer", calories: 45, proteinG: 4, max: 6 },
    },
    {
      base: ["1 bowl soya chunk upma", "1 glass soy milk"],
      calories: 370,
      proteinG: 30,
      diets: ["veg", "egg", "nonveg", "vegan"],
      scale: { unit: "tbsp soya chunks", calories: 35, proteinG: 5, max: 6 },
    },
  ],
  Lunch: [
    {
      base: ["2 roti", "1 katori dal", "1 katori sabzi", "salad"],
      calories: 450,
      proteinG: 18,
      diets: ["veg", "egg", "nonveg", "vegan"],
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      base: ["1 katori rice", "1 katori rajma", "1 katori curd", "salad"],
      calories: 480,
      proteinG: 20,
      diets: ["veg", "egg", "nonveg"],
      scale: { unit: "katori rice", calories: 130, proteinG: 3, max: 4 },
    },
    {
      base: ["2 roti", "150g grilled chicken curry", "salad"],
      calories: 500,
      proteinG: 38,
      diets: ["nonveg"],
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      base: ["1 katori rice", "1 katori chana masala", "salad"],
      calories: 460,
      proteinG: 17,
      diets: ["veg", "egg", "nonveg", "vegan"],
      scale: { unit: "katori rice", calories: 130, proteinG: 3, max: 4 },
    },
    {
      base: ["2 roti", "150g paneer bhurji", "salad"],
      calories: 490,
      proteinG: 26,
      diets: ["veg", "egg", "nonveg"],
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      base: ["1 katori rice", "1 katori soya chunk curry", "1 katori curd", "salad"],
      calories: 500,
      proteinG: 38,
      diets: ["veg", "egg", "nonveg"],
      scale: { unit: "katori rice", calories: 130, proteinG: 3, max: 4 },
    },
    {
      base: ["2 roti", "1 katori dal", "150g tofu bhurji", "salad"],
      calories: 510,
      proteinG: 33,
      diets: ["veg", "egg", "nonveg", "vegan"],
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
  ],
  Snack: [
    {
      base: ["1 apple", "10 almonds"],
      calories: 170,
      proteinG: 4,
      diets: ["veg", "egg", "nonveg", "vegan"],
      scale: { unit: "5 almonds", calories: 35, proteinG: 1.5, max: 4 },
    },
    {
      base: ["1 katori roasted chana", "green tea"],
      calories: 180,
      proteinG: 10,
      diets: ["veg", "egg", "nonveg", "vegan"],
      scale: { unit: "tbsp roasted chana", calories: 30, proteinG: 2, max: 6 },
    },
    {
      base: ["1 glass buttermilk", "1 katori sprouts chaat"],
      calories: 190,
      proteinG: 12,
      diets: ["veg", "egg", "nonveg"],
      scale: { unit: "tbsp sprouts", calories: 25, proteinG: 2, max: 6 },
    },
    {
      base: ["2 boiled eggs", "black coffee"],
      calories: 160,
      proteinG: 13,
      diets: ["egg", "nonveg"],
      scale: { unit: "boiled egg white", calories: 18, proteinG: 4, max: 6 },
    },
    {
      base: ["1 katori hung curd with roasted jeera", "1 tbsp flax seeds"],
      calories: 175,
      proteinG: 16,
      diets: ["veg", "egg", "nonveg"],
      scale: { unit: "tbsp hung curd", calories: 20, proteinG: 2.5, max: 6 },
    },
    {
      base: ["100g grilled paneer tikka", "green tea"],
      calories: 200,
      proteinG: 18,
      diets: ["veg", "egg", "nonveg"],
      scale: { unit: "25g paneer", calories: 50, proteinG: 4.5, max: 4 },
    },
    {
      base: ["1 glass chaas", "1 small cucumber with chaat masala"],
      calories: 80,
      proteinG: 4,
      diets: ["veg", "egg", "nonveg"],
      scale: { unit: "tbsp roasted chana", calories: 30, proteinG: 2, max: 6 },
    },
    {
      base: ["1 katori boiled black chana", "lemon and onion"],
      calories: 130,
      proteinG: 9,
      diets: ["veg", "egg", "nonveg", "vegan"],
      scale: { unit: "tbsp black chana", calories: 28, proteinG: 2, max: 6 },
    },
  ],
  Dinner: [
    {
      base: ["2 roti", "1 katori mixed sabzi", "1 katori dal"],
      calories: 420,
      proteinG: 17,
      diets: ["veg", "egg", "nonveg", "vegan"],
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      base: ["150g grilled fish", "1 katori sauteed vegetables", "1 roti"],
      calories: 430,
      proteinG: 36,
      diets: ["nonveg"],
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      base: ["1 bowl vegetable khichdi", "1 katori curd", "papad"],
      calories: 400,
      proteinG: 15,
      diets: ["veg", "egg", "nonveg"],
      scale: { unit: "katori khichdi", calories: 120, proteinG: 4, max: 3 },
    },
    {
      base: ["1 bowl tofu and vegetable stir fry", "1 katori brown rice"],
      calories: 440,
      proteinG: 24,
      diets: ["veg", "egg", "nonveg", "vegan"],
      scale: { unit: "katori brown rice", calories: 120, proteinG: 3, max: 4 },
    },
  ],
};

const WORKOUTS: Record<Goal, { day: string; focus: string; exercises: string[] }[]> = {
  lose: [
    { day: "Mon", focus: "Full body strength", exercises: ["Squats 3x12", "Push-ups 3x10", "Dumbbell rows 3x12", "Plank 3x30s"] },
    { day: "Tue", focus: "Cardio", exercises: ["Brisk walk or jog, 30 min", "Stretching, 10 min"] },
    { day: "Wed", focus: "Lower body", exercises: ["Lunges 3x12 each leg", "Glute bridges 3x15", "Calf raises 3x20", "Side plank 3x20s"] },
    { day: "Thu", focus: "Rest or light walk", exercises: ["20 min easy walk", "Mobility work"] },
    { day: "Fri", focus: "Upper body", exercises: ["Push-ups 3x10", "Shoulder press 3x12", "Bicep curls 3x12", "Dead bug 3x10"] },
    { day: "Sat", focus: "Cardio + core", exercises: ["25 min cycling or jog", "Crunches 3x15", "Leg raises 3x12"] },
    { day: "Sun", focus: "Rest", exercises: ["Full rest, or a gentle walk"] },
  ],
  maintain: [
    { day: "Mon", focus: "Upper body", exercises: ["Push-ups 3x12", "Dumbbell rows 3x12", "Shoulder press 3x10"] },
    { day: "Tue", focus: "Cardio", exercises: ["30 min brisk walk, jog or cycle"] },
    { day: "Wed", focus: "Lower body", exercises: ["Squats 3x15", "Lunges 3x12 each leg", "Glute bridges 3x15"] },
    { day: "Thu", focus: "Rest", exercises: ["Stretching, 15 min"] },
    { day: "Fri", focus: "Full body", exercises: ["Deadlifts 3x10", "Push-ups 3x12", "Plank 3x40s"] },
    { day: "Sat", focus: "Something you enjoy", exercises: ["Sport, swim, dance or a long walk"] },
    { day: "Sun", focus: "Rest", exercises: ["Full rest"] },
  ],
  gain: [
    { day: "Mon", focus: "Push", exercises: ["Bench press 4x8", "Shoulder press 3x10", "Tricep dips 3x12"] },
    { day: "Tue", focus: "Pull", exercises: ["Pull-ups or lat pulldown 4x8", "Barbell rows 3x10", "Bicep curls 3x12"] },
    { day: "Wed", focus: "Legs", exercises: ["Squats 4x8", "Romanian deadlift 3x10", "Calf raises 3x15"] },
    { day: "Thu", focus: "Rest", exercises: ["Light stretching"] },
    { day: "Fri", focus: "Push", exercises: ["Incline press 4x8", "Lateral raises 3x12", "Close-grip push-ups 3x12"] },
    { day: "Sat", focus: "Pull + legs", exercises: ["Deadlifts 4x6", "Barbell rows 3x10", "Lunges 3x12 each leg"] },
    { day: "Sun", focus: "Rest", exercises: ["Full rest — muscle is built on rest days"] },
  ],
};

/** Scales an option's staple toward the calorie target and reports the result. */
function scaleOption(option: FoodOption, targetCalories: number) {
  const items = [...option.base];
  let calories = option.calories;
  let proteinG = option.proteinG;

  if (option.scale) {
    for (let n = 1; n <= option.scale.max; n++) {
      const next = calories + option.scale.calories;
      if (Math.abs(next - targetCalories) >= Math.abs(calories - targetCalories)) break;
      calories = next;
      proteinG += option.scale.proteinG;
      items.push(`+ 1 ${option.scale.unit}`);
    }
  }

  return { items, calories, proteinG };
}

function buildMeal(
  slot: MealSlot,
  targetCalories: number,
  targetProtein: number,
  diet: DietType,
): Meal {
  const available = FOODS[slot].filter((f) => f.diets.includes(diet));

  /*
   * Score every option and take the best fit. Missing the protein target is
   * penalised twice as hard as missing calories, because protein is the number
   * people actually fail to hit — especially on vegetarian plans, where the
   * calorie-cheapest option is almost never the protein-adequate one.
   * Overshooting protein is not penalised at all; there is no harm in it here.
   */
  const scored = available.map((option) => {
    const scaled = scaleOption(option, targetCalories);
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

    return { option, scaled, score: caloriePenalty + proteinPenalty + proteinExcess * 0.6 };
  });

  scored.sort((a, b) => a.score - b.score);
  const best = scored[0];

  // The swap is the next best option, so it is a real alternative rather than
  // whatever happened to be next in the list.
  const runnerUp = scored[1] ?? best;

  return {
    slot,
    items: best.scaled.items,
    calories: Math.round(best.scaled.calories),
    proteinG: Math.round(best.scaled.proteinG),
    swap: runnerUp.option.base.join(", "),
  };
}

export function buildBuiltinPlan(
  nutrition: NutritionPlan,
  diet: DietType,
  goal: Goal,
): MealPlan {
  const slots: MealSlot[] = ["Breakfast", "Lunch", "Snack", "Dinner"];

  const meals = slots.map((slot) =>
    buildMeal(
      slot,
      Math.round(nutrition.calories * MEAL_SPLIT[slot]),
      Math.round(nutrition.macros.proteinG * MEAL_SPLIT[slot]),
      diet,
    ),
  );

  const proteinAchieved = meals.reduce((sum, m) => sum + m.proteinG, 0);

  const notes = [
    `Aim for around ${nutrition.macros.proteinG}g of protein a day — it is the one number worth tracking if you only track one.`,
    "Drink water through the day, and a glass before each meal. Thirst is very often mistaken for hunger.",
    "Eat dinner at least two hours before you sleep.",
    "One meal off plan changes nothing. Two weeks off plan does. Get back to it at the next meal, not the next Monday.",
  ];

  if (diet === "veg" || diet === "vegan") {
    notes.unshift(
      "Getting enough protein on a plant-based diet takes planning: dal, chana, rajma, tofu, soya chunks and peanuts should show up daily.",
    );
  }

  // Say so when the plan cannot reach the target, rather than quietly
  // presenting a short day as if it met the number.
  const shortfall = nutrition.macros.proteinG - proteinAchieved;
  if (shortfall > 10) {
    notes.unshift(
      `This day lands about ${shortfall}g short of your protein target. At this calorie level that is genuinely hard to close with home food alone — adding a scoop of whey, extra soya chunks, or another katori of dal is the usual fix.`,
    );
  }

  return { meals, workout: WORKOUTS[goal], notes, source: "builtin" };
}
