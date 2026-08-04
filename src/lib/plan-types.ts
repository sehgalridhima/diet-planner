/* ===============================================================
   PLAN TYPES — browser-safe
   ===============================================================
   Shared between the form, the results view, and the API route.
   Nothing here touches the filesystem or the Claude SDK, so client
   components can import it freely.
   =============================================================== */

export type DietType = "veg" | "egg" | "nonveg" | "vegan";

export const DIET_OPTIONS: { value: DietType; label: string; hint: string }[] = [
  { value: "veg", label: "Vegetarian", hint: "No egg, no meat" },
  { value: "egg", label: "Eggetarian", hint: "Egg is fine, no meat" },
  { value: "nonveg", label: "Non-vegetarian", hint: "Everything" },
  { value: "vegan", label: "Vegan", hint: "No dairy either" },
];

export type MealSlot = "Breakfast" | "Lunch" | "Snack" | "Dinner";

export type Meal = {
  slot: MealSlot;
  /** What to eat, as portions a person can picture: "2 roti", "1 katori dal" */
  items: string[];
  calories: number;
  proteinG: number;
  /** An alternative for this meal, same calories, for days you don't want it */
  swap: string;
};

export type WorkoutDay = {
  day: string;
  focus: string;
  exercises: string[];
};

export type MealPlan = {
  meals: Meal[];
  workout: WorkoutDay[];
  /** Short, practical pointers — hydration, timing, what to watch for */
  notes: string[];
  /** Which engine produced this plan. Shown in the UI so it's never a mystery. */
  source: "ai" | "builtin";
};

/** How the day's calories are split across meals */
export const MEAL_SPLIT: Record<MealSlot, number> = {
  Breakfast: 0.25,
  Lunch: 0.35,
  Snack: 0.1,
  Dinner: 0.3,
};
