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

export const MEAL_SLOTS: MealSlot[] = ["Breakfast", "Lunch", "Snack", "Dinner"];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/**
 * A staple that can be added in whole units to fine-tune a dish toward
 * the calorie target — "+ 1 roti" rather than a fractional portion.
 */
export type ScaleUnit = {
  unit: string;
  calories: number;
  proteinG: number;
  max: number;
};

/**
 * One candidate dish, before it has been scaled or assigned to a day.
 * Both engines produce these: the built-in table filters its own list
 * by diet, and Claude returns a pool already fitted to the diet.
 */
export type Dish = {
  /** Items at the base portion, e.g. ["2 roti", "1 katori dal"] */
  items: string[];
  calories: number;
  proteinG: number;
  scale?: ScaleUnit;
};

/** Candidate dishes per slot. The week is assembled from this. */
export type MealPool = Record<MealSlot, Dish[]>;

export type Meal = {
  slot: MealSlot;
  /** What to eat, as portions a person can picture: "2 roti", "1 katori dal" */
  items: string[];
  calories: number;
  proteinG: number;
  /** An alternative for this meal, same calories, for days you don't want it */
  swap: string;
};

export type DayPlan = {
  /** "Mon" … "Sun" */
  day: string;
  meals: Meal[];
  /** What this day actually adds up to — days vary a little, and that is fine */
  calories: number;
  proteinG: number;
};

export type WorkoutDay = {
  day: string;
  focus: string;
  exercises: string[];
  /** True on rest days, so the UI can style them down rather than shout them */
  rest?: boolean;
};

export type MealPlan = {
  /** Seven days, so no one eats the same breakfast every morning */
  days: DayPlan[];
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
