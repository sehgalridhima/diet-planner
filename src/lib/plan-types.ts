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

/**
 * Regional cuisine, as a preference rather than a rule.
 *
 * The keywords are what the built-in planner has to work with: its
 * table is mostly pan-Indian staples, so it can lean a week toward a
 * region but cannot invent Bengali food it does not have. Claude can,
 * and does, which is why the label goes into the prompt as well.
 */
export type Cuisine =
  | "any"
  | "north"
  | "south"
  | "punjabi"
  | "gujarati"
  | "maharashtrian"
  | "bengali"
  | "continental";

export const CUISINE_OPTIONS: {
  value: Cuisine;
  label: string;
  /** Fed to the built-in planner's scoring as a nudge */
  keywords: string[];
}[] = [
  { value: "any", label: "Anything", keywords: [] },
  {
    value: "north",
    label: "North Indian",
    keywords: ["roti", "dal", "sabzi", "rajma", "chole", "paneer", "paratha"],
  },
  {
    value: "south",
    label: "South Indian",
    keywords: ["idli", "dosa", "sambar", "poriyal", "rasam", "upma", "curd rice", "uttapam"],
  },
  {
    value: "punjabi",
    label: "Punjabi",
    keywords: ["rajma", "chole", "paneer", "saag", "makki", "lassi", "paratha", "kadhi"],
  },
  {
    value: "gujarati",
    label: "Gujarati",
    keywords: ["dhokla", "thepla", "khichdi", "kadhi", "handvo", "undhiyu", "khakhra"],
  },
  {
    value: "maharashtrian",
    label: "Maharashtrian",
    keywords: ["poha", "misal", "thalipeeth", "zunka", "bhakri", "amti", "usal"],
  },
  {
    value: "bengali",
    label: "Bengali",
    keywords: ["fish", "macher", "jhol", "posto", "cholar", "luchi", "shukto"],
  },
  {
    value: "continental",
    label: "Continental",
    keywords: ["pasta", "salad", "grilled", "soup", "oats", "sandwich", "stir fry", "bowl"],
  },
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

/**
 * A named section within a session — "Strength", "Core", "Finish".
 *
 * Real programmes are written in blocks, and a flat list of seven
 * lines hides which of them is the training and which is the ten
 * minutes of walking at the end.
 */
export type WorkoutBlock = {
  name: string;
  items: string[];
};

export type WorkoutDay = {
  day: string;
  focus: string;
  blocks: WorkoutBlock[];
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
