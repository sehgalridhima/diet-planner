import {
  MEAL_SLOTS,
  type DietType,
  type Dish,
  type MealPlan,
  type MealPool,
  type MealSlot,
} from "@/lib/plan-types";
import type { NutritionPlan, UserInput } from "@/lib/nutrition";
import { assembleWeek } from "@/lib/week";
import { buildWorkout, type Equipment } from "@/lib/workout-planner";

/* ===============================================================
   BUILT-IN PLANNER — no API, no cost
   ===============================================================
   Assembles a week of Indian meals from a food table to hit the
   calorie and protein targets the nutrition engine produced.

   It exists for three reasons:
     1. The whole app can be built and tested without spending a
        rupee of API credit.
     2. It is the fallback when the AI call fails or the key is
        missing — the tool never shows a user a dead end.
     3. It is the free mode, for anyone running this without a key.

   Portions are written the way people actually eat, not in grams.

   The table needs at least seven usable options per slot per diet,
   or the week starts repeating. Vegan is the binding constraint —
   check that diet first when adding or removing anything.
   =============================================================== */

type FoodOption = Dish & { diets: DietType[] };

const ALL_DIETS: DietType[] = ["veg", "egg", "nonveg", "vegan"];
/** Contains dairy: fine for everyone except vegan */
const DAIRY: DietType[] = ["veg", "egg", "nonveg"];

const FOODS: Record<MealSlot, FoodOption[]> = {
  Breakfast: [
    {
      items: ["2 besan chilla (60 g besan)", "1 katori curd (150 g)", "1 tsp green chutney"],
      calories: 340,
      proteinG: 18,
      diets: DAIRY,
      scale: { unit: "besan chilla", calories: 110, proteinG: 6, max: 4 },
    },
    {
      items: ["3 egg whites + 1 whole egg bhurji", "2 multigrain toast (60 g)"],
      calories: 380,
      proteinG: 26,
      diets: ["egg", "nonveg"],
      scale: { unit: "egg white", calories: 18, proteinG: 4, max: 6 },
    },
    {
      items: ["1 bowl vegetable poha (60 g raw)", "1 glass milk (250 ml)"],
      calories: 350,
      proteinG: 12,
      diets: DAIRY,
      scale: { unit: "tbsp roasted peanuts", calories: 55, proteinG: 3, max: 5 },
    },
    {
      items: ["2 idli (80 g batter)", "1 katori sambar (200 g)", "1 tsp coconut chutney"],
      calories: 300,
      proteinG: 11,
      diets: ALL_DIETS,
      scale: { unit: "idli", calories: 60, proteinG: 2, max: 5 },
    },
    {
      items: ["1 bowl oats cooked in soy milk (50 g raw oats)", "1 tbsp peanut butter", "1 banana (120 g)"],
      calories: 400,
      proteinG: 15,
      diets: ALL_DIETS,
      scale: { unit: "tbsp oats", calories: 40, proteinG: 1.5, max: 8 },
    },
    {
      items: ["1 bowl moong dal chilla with paneer stuffing (60 g dal, 40 g paneer)", "1 katori curd (150 g)"],
      calories: 380,
      proteinG: 28,
      diets: DAIRY,
      scale: { unit: "tbsp paneer", calories: 45, proteinG: 4, max: 6 },
    },
    {
      items: ["1 bowl soya chunk upma (50 g rava, 25 g soya)", "1 glass soy milk (250 ml)"],
      calories: 370,
      proteinG: 30,
      diets: ALL_DIETS,
      scale: { unit: "tbsp soya chunks", calories: 35, proteinG: 5, max: 6 },
    },
    {
      items: ["2 dosa (120 g batter)", "1 katori sambar (200 g)", "1 tsp coconut chutney"],
      calories: 360,
      proteinG: 12,
      diets: ALL_DIETS,
      scale: { unit: "dosa", calories: 130, proteinG: 3, max: 3 },
    },
    {
      items: ["1 bowl dalia cooked in milk (50 g raw)", "6 almonds (7 g)"],
      calories: 330,
      proteinG: 13,
      diets: DAIRY,
      scale: { unit: "tbsp dalia", calories: 45, proteinG: 1.5, max: 6 },
    },
    {
      items: ["1 bowl sprouts chaat (100 g)", "1 glass chaas (250 ml)"],
      calories: 260,
      proteinG: 16,
      diets: DAIRY,
      scale: { unit: "tbsp sprouts", calories: 25, proteinG: 2, max: 8 },
    },
    {
      items: ["2 aloo paratha made with 1 tsp oil (70 g atta)", "1 katori curd (150 g)"],
      calories: 480,
      proteinG: 14,
      diets: DAIRY,
      scale: { unit: "katori curd", calories: 60, proteinG: 6, max: 2 },
    },
    {
      items: ["1 bowl ragi porridge with jaggery (40 g ragi)", "8 almonds (10 g)"],
      calories: 340,
      proteinG: 10,
      diets: ALL_DIETS,
      scale: { unit: "tbsp ragi", calories: 40, proteinG: 1.5, max: 6 },
    },
    {
      items: ["2 egg omelette with onion and tomato", "2 toast"],
      calories: 360,
      proteinG: 20,
      diets: ["egg", "nonveg"],
      scale: { unit: "egg white", calories: 18, proteinG: 4, max: 6 },
    },
    {
      items: ["1 katori paneer bhurji (180 g)", "2 roti (70 g atta)"],
      calories: 420,
      proteinG: 24,
      diets: DAIRY,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 4 },
    },
    {
      items: ["1 glass banana and peanut smoothie with soy milk", "1 tbsp chia seeds"],
      calories: 330,
      proteinG: 14,
      diets: ALL_DIETS,
      scale: { unit: "tbsp peanut butter", calories: 95, proteinG: 4, max: 3 },
    },
    {
      items: ["1 bowl chana chaat with lemon and onion (100 g)", "1 cup black tea"],
      calories: 290,
      proteinG: 14,
      diets: ALL_DIETS,
      scale: { unit: "tbsp chana", calories: 30, proteinG: 2, max: 6 },
    },
    {
      items: ["1 bowl vegetable upma with roasted peanuts (50 g rava)", "1 cup black tea"],
      calories: 340,
      proteinG: 11,
      diets: ALL_DIETS,
      scale: { unit: "tbsp roasted peanuts", calories: 55, proteinG: 3, max: 4 },
    },
  ],

  Lunch: [
    {
      items: ["2 roti (70 g atta)", "1 katori dal (250 g)", "1 katori sabzi (150 g)", "salad"],
      calories: 450,
      proteinG: 18,
      diets: ALL_DIETS,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 katori rice (150 g cooked)", "1 katori rajma (200 g)", "1 katori curd (150 g)", "salad"],
      calories: 480,
      proteinG: 20,
      diets: DAIRY,
      scale: { unit: "katori rice", calories: 130, proteinG: 3, max: 4 },
    },
    {
      items: ["2 roti (70 g atta)", "150g grilled chicken curry", "salad"],
      calories: 500,
      proteinG: 38,
      diets: ["nonveg"],
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 katori rice (150 g cooked)", "1 katori chana masala (200 g)", "salad"],
      calories: 460,
      proteinG: 17,
      diets: ALL_DIETS,
      scale: { unit: "katori rice", calories: 130, proteinG: 3, max: 4 },
    },
    {
      items: ["2 roti (70 g atta)", "150g paneer bhurji", "salad"],
      calories: 490,
      proteinG: 26,
      diets: DAIRY,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 katori rice (150 g cooked)", "1 katori soya chunk curry (200 g)", "1 katori curd (150 g)", "salad"],
      calories: 500,
      proteinG: 38,
      diets: DAIRY,
      scale: { unit: "katori rice", calories: 130, proteinG: 3, max: 4 },
    },
    {
      items: ["2 roti (70 g atta)", "1 katori dal (250 g)", "150g tofu bhurji", "salad"],
      calories: 510,
      proteinG: 33,
      diets: ALL_DIETS,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 katori rice (150 g cooked)", "1 katori sambar (200 g)", "1 katori beans poriyal (150 g)"],
      calories: 430,
      proteinG: 14,
      diets: ALL_DIETS,
      scale: { unit: "katori rice", calories: 130, proteinG: 3, max: 4 },
    },
    {
      items: ["2 roti (70 g atta)", "1 katori chole (200 g)", "1 katori curd (150 g)", "salad"],
      calories: 500,
      proteinG: 22,
      diets: DAIRY,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 bowl rajma chawal (150 g rice, 200 g rajma)", "salad"],
      calories: 520,
      proteinG: 19,
      diets: ALL_DIETS,
      scale: { unit: "katori rice", calories: 130, proteinG: 3, max: 3 },
    },
    {
      items: ["2 roti (70 g atta)", "1 katori egg curry made with 2 eggs (200 g)", "salad"],
      calories: 470,
      proteinG: 22,
      diets: ["egg", "nonveg"],
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 katori rice (150 g cooked)", "150g fish curry", "1 katori sabzi (150 g)"],
      calories: 470,
      proteinG: 34,
      diets: ["nonveg"],
      scale: { unit: "katori rice", calories: 130, proteinG: 3, max: 4 },
    },
    {
      items: ["2 roti (70 g atta)", "1 katori palak paneer (200 g)", "salad"],
      calories: 480,
      proteinG: 24,
      diets: DAIRY,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 bowl vegetable pulao (150 g cooked)", "1 katori raita (150 g)", "salad"],
      calories: 450,
      proteinG: 14,
      diets: DAIRY,
      scale: { unit: "katori pulao", calories: 140, proteinG: 4, max: 3 },
    },
    {
      items: ["2 roti (70 g atta)", "1 katori mixed dal (250 g)", "100g grilled paneer", "salad"],
      calories: 520,
      proteinG: 32,
      diets: DAIRY,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 katori brown rice (150 g cooked)", "1 katori black chana curry (200 g)", "salad"],
      calories: 460,
      proteinG: 20,
      diets: ALL_DIETS,
      scale: { unit: "katori brown rice", calories: 120, proteinG: 3, max: 4 },
    },
    {
      items: ["2 roti (70 g atta)", "1 katori lobia curry (200 g)", "salad"],
      calories: 460,
      proteinG: 20,
      diets: ALL_DIETS,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 bowl vegetable dalia (60 g raw)", "1 katori dal (250 g)", "salad"],
      calories: 440,
      proteinG: 18,
      diets: ALL_DIETS,
      scale: { unit: "katori dal", calories: 130, proteinG: 8, max: 3 },
    },
  ],

  Snack: [
    {
      items: ["1 apple (180 g)", "10 almonds (12 g)"],
      calories: 170,
      proteinG: 4,
      diets: ALL_DIETS,
      scale: { unit: "5 almonds", calories: 35, proteinG: 1.5, max: 4 },
    },
    {
      items: ["1 katori roasted chana (30 g)", "green tea"],
      calories: 180,
      proteinG: 10,
      diets: ALL_DIETS,
      scale: { unit: "tbsp roasted chana", calories: 30, proteinG: 2, max: 6 },
    },
    {
      items: ["1 glass buttermilk (250 ml)", "1 katori sprouts chaat"],
      calories: 190,
      proteinG: 12,
      diets: DAIRY,
      scale: { unit: "tbsp sprouts", calories: 25, proteinG: 2, max: 6 },
    },
    {
      items: ["2 boiled eggs (100 g)", "black coffee"],
      calories: 160,
      proteinG: 13,
      diets: ["egg", "nonveg"],
      scale: { unit: "boiled egg white", calories: 18, proteinG: 4, max: 6 },
    },
    {
      items: ["1 katori hung curd with roasted jeera (150 g)", "1 tbsp flax seeds"],
      calories: 175,
      proteinG: 16,
      diets: DAIRY,
      scale: { unit: "tbsp hung curd", calories: 20, proteinG: 2.5, max: 6 },
    },
    {
      items: ["100g grilled paneer tikka", "green tea"],
      calories: 200,
      proteinG: 18,
      diets: DAIRY,
      scale: { unit: "25g paneer", calories: 50, proteinG: 4.5, max: 4 },
    },
    {
      items: ["1 glass chaas (250 ml)", "1 small cucumber with chaat masala"],
      calories: 80,
      proteinG: 4,
      diets: DAIRY,
      scale: { unit: "tbsp roasted chana", calories: 30, proteinG: 2, max: 6 },
    },
    {
      items: ["1 katori boiled black chana (100 g)", "lemon and onion"],
      calories: 130,
      proteinG: 9,
      diets: ALL_DIETS,
      scale: { unit: "tbsp black chana", calories: 28, proteinG: 2, max: 6 },
    },
    {
      items: ["1 banana (120 g)", "1 tbsp peanut butter"],
      calories: 200,
      proteinG: 7,
      diets: ALL_DIETS,
      scale: { unit: "tsp peanut butter", calories: 32, proteinG: 1.3, max: 4 },
    },
    {
      items: ["1 katori roasted makhana (25 g)", "green tea"],
      calories: 130,
      proteinG: 4,
      diets: ALL_DIETS,
      scale: { unit: "katori makhana", calories: 70, proteinG: 2, max: 3 },
    },
    {
      items: ["1 glass soy milk (250 ml)", "6 walnuts (18 g)"],
      calories: 180,
      proteinG: 9,
      diets: ALL_DIETS,
      scale: { unit: "walnut", calories: 26, proteinG: 1, max: 6 },
    },
    {
      items: ["1 katori fruit chaat with lemon (150 g)"],
      calories: 120,
      proteinG: 2,
      diets: ALL_DIETS,
      scale: { unit: "katori fruit", calories: 60, proteinG: 1, max: 3 },
    },
    {
      items: ["1 bowl moong sprouts salad with tomato and onion (100 g)"],
      calories: 160,
      proteinG: 12,
      diets: ALL_DIETS,
      scale: { unit: "tbsp sprouts", calories: 25, proteinG: 2, max: 6 },
    },
    {
      items: ["1 katori curd with 1 tbsp chia seeds (150 g curd)"],
      calories: 150,
      proteinG: 11,
      diets: DAIRY,
      scale: { unit: "tbsp curd", calories: 15, proteinG: 1.5, max: 8 },
    },
    {
      items: ["2 khakhra (30 g)", "1 glass chaas (250 ml)"],
      calories: 170,
      proteinG: 7,
      diets: DAIRY,
      scale: { unit: "khakhra", calories: 60, proteinG: 2, max: 3 },
    },
  ],

  Dinner: [
    {
      items: ["2 roti (70 g atta)", "1 katori mixed sabzi (150 g)", "1 katori dal (250 g)"],
      calories: 420,
      proteinG: 17,
      diets: ALL_DIETS,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["150g grilled fish", "1 katori sauteed vegetables", "1 roti (35 g atta)"],
      calories: 430,
      proteinG: 36,
      diets: ["nonveg"],
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 bowl vegetable khichdi (60 g rice, 30 g dal)", "1 katori curd (150 g)", "papad"],
      calories: 400,
      proteinG: 15,
      diets: DAIRY,
      scale: { unit: "katori khichdi", calories: 120, proteinG: 4, max: 3 },
    },
    {
      items: ["1 bowl tofu and vegetable stir fry (150 g tofu)", "1 katori brown rice (150 g cooked)"],
      calories: 440,
      proteinG: 24,
      diets: ALL_DIETS,
      scale: { unit: "katori brown rice", calories: 120, proteinG: 3, max: 4 },
    },
    {
      items: ["2 roti (70 g atta)", "1 katori rajma (200 g)", "salad"],
      calories: 450,
      proteinG: 19,
      diets: ALL_DIETS,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["2 roti (70 g atta)", "1 katori palak paneer (200 g)"],
      calories: 440,
      proteinG: 22,
      diets: DAIRY,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["150g grilled chicken", "1 katori sauteed vegetables", "1 roti (35 g atta)"],
      calories: 440,
      proteinG: 40,
      diets: ["nonveg"],
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 bowl moong dal khichdi (60 g rice, 30 g dal)", "1 katori curd (150 g)"],
      calories: 410,
      proteinG: 18,
      diets: DAIRY,
      scale: { unit: "katori khichdi", calories: 120, proteinG: 4, max: 3 },
    },
    {
      items: ["1 bowl soya keema (50 g dry soya)", "2 roti (70 g atta)"],
      calories: 460,
      proteinG: 30,
      diets: ALL_DIETS,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 katori brown rice (150 g cooked)", "1 katori dal (250 g)", "1 katori lauki sabzi (150 g)"],
      calories: 400,
      proteinG: 16,
      diets: ALL_DIETS,
      scale: { unit: "katori brown rice", calories: 120, proteinG: 3, max: 4 },
    },
    {
      items: ["2 besan chilla (60 g besan)", "1 katori curd (150 g)", "salad"],
      calories: 360,
      proteinG: 20,
      diets: DAIRY,
      scale: { unit: "besan chilla", calories: 110, proteinG: 6, max: 4 },
    },
    {
      items: ["1 bowl egg curry made with 2 eggs", "2 roti (70 g atta)"],
      calories: 450,
      proteinG: 24,
      diets: ["egg", "nonveg"],
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 bowl vegetable oats upma (50 g raw oats)", "1 katori curd (150 g)"],
      calories: 380,
      proteinG: 16,
      diets: DAIRY,
      scale: { unit: "tbsp oats", calories: 40, proteinG: 1.5, max: 6 },
    },
    {
      items: ["2 roti (70 g atta)", "1 katori chole (200 g)", "salad"],
      calories: 440,
      proteinG: 18,
      diets: ALL_DIETS,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["1 katori rice (150 g cooked)", "1 katori sambar (200 g)", "1 katori cabbage poriyal (150 g)"],
      calories: 400,
      proteinG: 13,
      diets: ALL_DIETS,
      scale: { unit: "katori rice", calories: 130, proteinG: 3, max: 4 },
    },
    {
      items: ["150g paneer tikka", "1 katori dal (250 g)", "1 roti (35 g atta)"],
      calories: 470,
      proteinG: 34,
      diets: DAIRY,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
    {
      items: ["2 roti (70 g atta)", "1 katori mixed dal (250 g)", "1 katori bhindi sabzi (150 g)"],
      calories: 430,
      proteinG: 19,
      diets: ALL_DIETS,
      scale: { unit: "roti", calories: 110, proteinG: 3, max: 6 },
    },
  ],
};

/** The dishes this diet can actually eat, per slot. */
export function buildPool(diet: DietType): MealPool {
  const pool = {} as MealPool;
  for (const slot of MEAL_SLOTS) {
    pool[slot] = FOODS[slot].filter((f) => f.diets.includes(diet));
  }
  return pool;
}

/** How many options the table holds for a diet. Used by the check script. */
export function optionCounts(diet: DietType): Record<MealSlot, number> {
  const pool = buildPool(diet);
  const counts = {} as Record<MealSlot, number>;
  for (const slot of MEAL_SLOTS) {
    counts[slot] = pool[slot].length;
  }
  return counts;
}

export function buildBuiltinPlan(
  nutrition: NutritionPlan,
  input: UserInput,
  diet: DietType,
  equipment: Equipment,
  craving = "",
): MealPlan {
  const days = assembleWeek(
    buildPool(diet),
    nutrition.calories,
    nutrition.macros.proteinG,
    craving,
  );

  const workout = buildWorkout({
    goal: input.goal,
    activity: input.activity,
    age: input.age,
    equipment,
    // Protect the joints when age or bodyweight makes impact expensive.
    lowImpactOnly: input.age >= 55 || nutrition.bmi >= 30,
  });

  const notes = [
    `Aim for around ${nutrition.macros.proteinG}g of protein a day — it is the one number worth tracking if you only track one.`,
    "Drink water through the day, and a glass before each meal. Thirst is very often mistaken for hunger.",
    "Eat dinner at least two hours before you sleep.",
    "One meal off plan changes nothing. Two weeks off plan does. Get back to it at the next meal, not the next Monday.",
    ...workout.notes,
  ];

  if (diet === "veg" || diet === "vegan") {
    notes.unshift(
      "Getting enough protein on a plant-based diet takes planning: dal, chana, rajma, tofu, soya chunks and peanuts should show up daily.",
    );
  }

  // Say so when the week cannot reach the target, rather than quietly
  // presenting short days as if they met the number.
  const averageProtein = Math.round(
    days.reduce((sum, d) => sum + d.proteinG, 0) / days.length,
  );
  const shortfall = nutrition.macros.proteinG - averageProtein;

  if (shortfall > 10) {
    notes.unshift(
      `These days average about ${shortfall}g short of your protein target. At this calorie level that is genuinely hard to close with home food alone — adding a scoop of whey, extra soya chunks, or another katori of dal is the usual fix.`,
    );
  }

  return { days, workout: workout.days, notes, source: "builtin" };
}
