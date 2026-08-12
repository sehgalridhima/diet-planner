import { DAYS, type WorkoutBlock, type WorkoutDay } from "@/lib/plan-types";
import type { ActivityLevel, Goal } from "@/lib/nutrition";

/* ===============================================================
   WORKOUT PLANNER — no API, no cost, same every time
   ===============================================================
   Builds a week of training from the inputs already collected:
   equipment, activity level, goal and age.

   This does not go through Claude. A training split is a lookup
   and a few rules, not a language problem — and doing it in code
   means it is free, deterministic, testable, and cannot invent an
   exercise you have no equipment for. That last point was a real
   bug: the built-in path used to tell people with no equipment to
   bench press.

   THE CEILING RISES, THE FLOOR DOES NOT.

   Someone with a full gym training six days should get a session
   worth writing down: compounds, isolation work, a core block and a
   cardio finisher, in the shape a coach would actually write. A
   sedentary beginner gets four movements and a walk. Handing a
   beginner a seven-exercise session is the most reliable way to make
   them quit in week two, so session size scales with the same
   activity level that sets training frequency.
   =============================================================== */

export type Equipment = "none" | "bands" | "dumbbells" | "gym";

/** What each setting can actually reach. A gym has everything. */
export const AVAILABLE: Record<Equipment, Equipment[]> = {
  none: ["none"],
  bands: ["none", "bands"],
  dumbbells: ["none", "dumbbells"],
  gym: ["none", "bands", "dumbbells", "gym"],
};

/**
 * The choices the form offers, and what each one must parse to.
 * The form reads its options from here and check-plan.ts asserts the
 * mapping, so a new option cannot be added without a parser that
 * handles it.
 */
export const EQUIPMENT_OPTIONS: { label: string; value: Equipment }[] = [
  { label: "Bodyweight only", value: "none" },
  { label: "Resistance bands", value: "bands" },
  { label: "Dumbbells at home", value: "dumbbells" },
  { label: "Full gym", value: "gym" },
];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  none: "bodyweight only",
  bands: "resistance bands",
  dumbbells: "dumbbells at home",
  gym: "a full gym",
};

/**
 * The form sends free text, so read it loosely rather than trusting an
 * exact match.
 *
 * Order matters. "bodyweight" contains "weight", so it has to be ruled
 * out before the dumbbell test — otherwise the one answer that means
 * "I own nothing" reads as "I own dumbbells", which is precisely the
 * wrong way round to be wrong.
 */
export function parseEquipment(raw: string): Equipment {
  const s = raw.toLowerCase();
  if (s.includes("bodyweight") || s.includes("body weight")) return "none";
  if (s.includes("none") || s.includes("nothing")) return "none";
  if (s.includes("gym")) return "gym";
  if (s.includes("dumbbell") || s.includes("weight")) return "dumbbells";
  if (s.includes("band")) return "bands";
  return "none";
}

/**
 * Movement slots.
 *
 * The first five are the compound patterns a session is built around.
 * The rest are isolation groups, which is what turns four movements
 * into something that reads like a real programme: nobody writes a
 * push day without lateral raises and triceps on it.
 */
type Pattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "push"
  | "pull"
  | "chest-iso"
  | "shoulder-iso"
  | "tricep"
  | "bicep"
  | "back-iso"
  | "quad-iso"
  | "ham-iso"
  | "glute-iso"
  | "calf"
  | "core"
  | "cardio"
  | "conditioning";

type Role = "compound" | "isolation" | "core" | "cardio" | "conditioning";

export type Exercise = {
  name: string;
  pattern: Pattern;
  role: Role;
  needs: Equipment;
  /** Safe on knees, back and joints — what we fall back to for older or heavier trainees */
  lowImpact?: boolean;
  /** Measured in seconds rather than reps */
  hold?: boolean;
  /** Reps are per side, so the line has to say so */
  perSide?: boolean;
  /** Conditioning work measured in metres */
  metres?: number;
  /**
   * Groups strict variants of one movement — the same exercise made
   * easier or harder, not merely similar.
   *
   * A day should never prescribe push-ups and knee push-ups together:
   * the second is the first made easier, so doing both is doing the
   * same thing twice.
   */
  family?: string;
};

export const EXERCISES: Exercise[] = [
  // ================= Bodyweight: available to everyone =================
  { name: "Bodyweight squats", pattern: "squat", role: "compound", needs: "none", family: "bw-squat" },
  { name: "Chair squats", pattern: "squat", role: "compound", needs: "none", lowImpact: true, family: "bw-squat" },
  { name: "Wall sit", pattern: "squat", role: "compound", needs: "none", lowImpact: true, hold: true, family: "bw-squat" },
  { name: "Glute bridges", pattern: "hinge", role: "compound", needs: "none", lowImpact: true, family: "glute-bridge" },
  { name: "Single-leg glute bridge", pattern: "hinge", role: "compound", needs: "none", lowImpact: true, perSide: true, family: "glute-bridge" },
  { name: "Bodyweight good mornings", pattern: "hinge", role: "compound", needs: "none", lowImpact: true },
  { name: "Reverse lunges", pattern: "lunge", role: "compound", needs: "none", perSide: true, family: "bw-lunge" },
  { name: "Split squats", pattern: "lunge", role: "compound", needs: "none", perSide: true, family: "bw-lunge" },
  { name: "Step-ups onto a sturdy chair", pattern: "lunge", role: "compound", needs: "none", lowImpact: true, perSide: true },
  { name: "Push-ups", pattern: "push", role: "compound", needs: "none", family: "pushup" },
  { name: "Incline push-ups against a table", pattern: "push", role: "compound", needs: "none", lowImpact: true, family: "pushup" },
  { name: "Knee push-ups", pattern: "push", role: "compound", needs: "none", lowImpact: true, family: "pushup" },
  { name: "Pike push-ups", pattern: "push", role: "compound", needs: "none" },
  { name: "Close-grip push-ups", pattern: "push", role: "compound", needs: "none" },
  { name: "Chair dips with feet on the floor", pattern: "push", role: "compound", needs: "none", lowImpact: true, family: "dip" },
  { name: "Backpack floor press", pattern: "push", role: "compound", needs: "none", lowImpact: true, family: "floor-press" },
  { name: "Towel rows in a doorway", pattern: "pull", role: "compound", needs: "none" },
  { name: "Inverted rows under a sturdy table", pattern: "pull", role: "compound", needs: "none" },
  { name: "Backpack bent-over rows", pattern: "pull", role: "compound", needs: "none" },
  { name: "Superman holds", pattern: "back-iso", role: "isolation", needs: "none", lowImpact: true, hold: true },
  { name: "Prone Y-T-W raises", pattern: "back-iso", role: "isolation", needs: "none", lowImpact: true },
  { name: "Reverse snow angels", pattern: "back-iso", role: "isolation", needs: "none", lowImpact: true },
  { name: "Doorway isometric rows", pattern: "back-iso", role: "isolation", needs: "none", lowImpact: true, hold: true },
  { name: "Bodyweight calf raises", pattern: "calf", role: "isolation", needs: "none", lowImpact: true },
  { name: "Single-leg calf raises", pattern: "calf", role: "isolation", needs: "none", lowImpact: true, perSide: true },
  { name: "Plank", pattern: "core", role: "core", needs: "none", lowImpact: true, hold: true },
  { name: "Side plank", pattern: "core", role: "core", needs: "none", lowImpact: true, hold: true, perSide: true },
  { name: "Dead bug", pattern: "core", role: "core", needs: "none", lowImpact: true, perSide: true },
  { name: "Bird dog", pattern: "core", role: "core", needs: "none", lowImpact: true, perSide: true },
  { name: "Leg raises", pattern: "core", role: "core", needs: "none" },
  { name: "Crunches", pattern: "core", role: "core", needs: "none" },
  { name: "Russian twists", pattern: "core", role: "core", needs: "none" },
  { name: "Mountain climbers", pattern: "core", role: "core", needs: "none" },
  { name: "Brisk walk", pattern: "cardio", role: "cardio", needs: "none", lowImpact: true },
  /*
   * Cycling sits behind the gym tier because a stationary bike is
   * standard gym kit and a bicycle is not something we know anybody
   * owns. Swimming is gone from the table entirely: nothing on the
   * form tells us whether someone can reach a pool, and there is no
   * honest tier to file it under.
   *
   * Both were tagged "none" — the same as a brisk walk — so "bodyweight
   * only" was handing people a pool and a bicycle, directly under a
   * note promising that nothing in the plan needed kit they did not
   * have. Cardio was never checked against equipment the way the
   * strength lifts were.
   *
   * They come back as suggested swaps in the notes, where having
   * access is the reader's call rather than ours.
   */
  { name: "Cycling", pattern: "cardio", role: "cardio", needs: "gym", lowImpact: true },
  { name: "Jog", pattern: "cardio", role: "cardio", needs: "none" },
  { name: "Stair climbing", pattern: "cardio", role: "cardio", needs: "none" },
  { name: "Skipping", pattern: "cardio", role: "cardio", needs: "none" },
  { name: "Burpees", pattern: "conditioning", role: "conditioning", needs: "none" },
  { name: "Squat jumps", pattern: "conditioning", role: "conditioning", needs: "none" },
  { name: "High knees", pattern: "conditioning", role: "conditioning", needs: "none", hold: true },
  { name: "Shadow boxing", pattern: "conditioning", role: "conditioning", needs: "none", hold: true },

  // ================= Resistance bands =================
  { name: "Band squats", pattern: "squat", role: "compound", needs: "bands", lowImpact: true },
  { name: "Band deadlifts", pattern: "hinge", role: "compound", needs: "bands", lowImpact: true },
  { name: "Band chest press", pattern: "push", role: "compound", needs: "bands", lowImpact: true },
  { name: "Band shoulder press", pattern: "push", role: "compound", needs: "bands", lowImpact: true, family: "vertical-press" },
  { name: "Band rows", pattern: "pull", role: "compound", needs: "bands", lowImpact: true, family: "horizontal-row" },
  { name: "Band lat pulldown", pattern: "pull", role: "compound", needs: "bands", lowImpact: true, family: "vertical-pull" },
  { name: "Band face pulls", pattern: "back-iso", role: "isolation", needs: "bands", lowImpact: true, family: "rear-delt" },
  { name: "Band lateral raises", pattern: "shoulder-iso", role: "isolation", needs: "bands", lowImpact: true, family: "lateral" },
  { name: "Band bicep curls", pattern: "bicep", role: "isolation", needs: "bands", lowImpact: true },
  { name: "Band tricep pushdown", pattern: "tricep", role: "isolation", needs: "bands", lowImpact: true },
  { name: "Band glute kickbacks", pattern: "glute-iso", role: "isolation", needs: "bands", lowImpact: true, perSide: true },
  { name: "Band hip abductions", pattern: "glute-iso", role: "isolation", needs: "bands", lowImpact: true },

  // ================= Dumbbells at home =================
  { name: "Goblet squats", pattern: "squat", role: "compound", needs: "dumbbells", family: "db-squat" },
  { name: "Dumbbell front squat", pattern: "squat", role: "compound", needs: "dumbbells", family: "db-squat" },
  { name: "Dumbbell Romanian deadlift", pattern: "hinge", role: "compound", needs: "dumbbells", family: "db-hinge" },
  { name: "Dumbbell sumo deadlift", pattern: "hinge", role: "compound", needs: "dumbbells", family: "db-hinge" },
  { name: "Dumbbell lunges", pattern: "lunge", role: "compound", needs: "dumbbells", perSide: true },
  { name: "Dumbbell step-ups", pattern: "lunge", role: "compound", needs: "dumbbells", lowImpact: true, perSide: true },
  { name: "Dumbbell bench press", pattern: "push", role: "compound", needs: "dumbbells", family: "db-horizontal-press" },
  { name: "Incline dumbbell press", pattern: "push", role: "compound", needs: "dumbbells", family: "db-incline-press" },
  { name: "Dumbbell floor press", pattern: "push", role: "compound", needs: "dumbbells", lowImpact: true, family: "db-horizontal-press" },
  { name: "Seated dumbbell shoulder press", pattern: "push", role: "compound", needs: "dumbbells", family: "vertical-press" },
  { name: "Dumbbell rows", pattern: "pull", role: "compound", needs: "dumbbells", perSide: true, family: "horizontal-row" },
  { name: "Dumbbell pullover", pattern: "pull", role: "compound", needs: "dumbbells" },
  { name: "Dumbbell fly", pattern: "chest-iso", role: "isolation", needs: "dumbbells", family: "fly" },
  { name: "Dumbbell lateral raises", pattern: "shoulder-iso", role: "isolation", needs: "dumbbells", lowImpact: true, family: "lateral" },
  { name: "Dumbbell front raises", pattern: "shoulder-iso", role: "isolation", needs: "dumbbells", lowImpact: true },
  { name: "Dumbbell reverse fly", pattern: "back-iso", role: "isolation", needs: "dumbbells", lowImpact: true, family: "rear-delt" },
  { name: "Dumbbell curls", pattern: "bicep", role: "isolation", needs: "dumbbells", lowImpact: true, family: "curl" },
  { name: "Hammer curls", pattern: "bicep", role: "isolation", needs: "dumbbells", lowImpact: true },
  { name: "Dumbbell overhead tricep extension", pattern: "tricep", role: "isolation", needs: "dumbbells", lowImpact: true, family: "tricep-ext" },
  { name: "Dumbbell skull crushers", pattern: "tricep", role: "isolation", needs: "dumbbells", family: "skull-crusher" },
  { name: "Dumbbell hip thrust", pattern: "glute-iso", role: "isolation", needs: "dumbbells", lowImpact: true, family: "hip-thrust" },
  { name: "Dumbbell calf raises", pattern: "calf", role: "isolation", needs: "dumbbells", lowImpact: true },
  { name: "Suitcase carry", pattern: "core", role: "core", needs: "dumbbells", lowImpact: true },
  { name: "Farmer's carry", pattern: "conditioning", role: "conditioning", needs: "dumbbells", metres: 30 },
  { name: "Dumbbell swings", pattern: "conditioning", role: "conditioning", needs: "dumbbells" },
  { name: "Dumbbell thrusters", pattern: "conditioning", role: "conditioning", needs: "dumbbells" },

  // ================= Full gym =================
  { name: "Barbell back squat", pattern: "squat", role: "compound", needs: "gym", family: "bb-squat" },
  { name: "Smith machine squat", pattern: "squat", role: "compound", needs: "gym", lowImpact: true, family: "bb-squat" },
  { name: "Leg press", pattern: "squat", role: "compound", needs: "gym", lowImpact: true },
  { name: "Hack squat", pattern: "squat", role: "compound", needs: "gym" },
  { name: "Barbell deadlift", pattern: "hinge", role: "compound", needs: "gym", family: "bb-hinge" },
  { name: "Romanian deadlift", pattern: "hinge", role: "compound", needs: "gym", family: "bb-hinge" },
  { name: "Back extensions", pattern: "hinge", role: "compound", needs: "gym", lowImpact: true },
  { name: "Walking lunges", pattern: "lunge", role: "compound", needs: "gym", perSide: true },
  { name: "Bulgarian split squats", pattern: "lunge", role: "compound", needs: "gym", perSide: true },
  { name: "Barbell bench press", pattern: "push", role: "compound", needs: "gym", family: "bb-horizontal-press" },
  { name: "Incline barbell press", pattern: "push", role: "compound", needs: "gym", family: "bb-incline-press" },
  { name: "Machine chest press", pattern: "push", role: "compound", needs: "gym", lowImpact: true, family: "bb-horizontal-press" },
  { name: "Overhead barbell press", pattern: "push", role: "compound", needs: "gym", family: "vertical-press" },
  { name: "Machine shoulder press", pattern: "push", role: "compound", needs: "gym", lowImpact: true, family: "vertical-press" },
  { name: "Pull-ups", pattern: "pull", role: "compound", needs: "gym", family: "vertical-pull" },
  { name: "Lat pulldown", pattern: "pull", role: "compound", needs: "gym", lowImpact: true, family: "vertical-pull" },
  { name: "Chest-supported row", pattern: "pull", role: "compound", needs: "gym", lowImpact: true, family: "horizontal-row" },
  { name: "Seated cable row", pattern: "pull", role: "compound", needs: "gym", lowImpact: true, family: "horizontal-row" },
  { name: "Barbell rows", pattern: "pull", role: "compound", needs: "gym", family: "barbell-row" },
  { name: "Single-arm cable row", pattern: "pull", role: "compound", needs: "gym", lowImpact: true, perSide: true },
  { name: "Pec deck fly", pattern: "chest-iso", role: "isolation", needs: "gym", lowImpact: true, family: "fly" },
  { name: "Cable chest fly", pattern: "chest-iso", role: "isolation", needs: "gym", lowImpact: true, family: "fly" },
  { name: "Cable lateral raises", pattern: "shoulder-iso", role: "isolation", needs: "gym", lowImpact: true, family: "lateral" },
  { name: "Machine lateral raises", pattern: "shoulder-iso", role: "isolation", needs: "gym", lowImpact: true, family: "lateral" },
  { name: "Cable face pulls", pattern: "back-iso", role: "isolation", needs: "gym", lowImpact: true, family: "rear-delt" },
  { name: "Straight-arm pulldown", pattern: "back-iso", role: "isolation", needs: "gym", lowImpact: true },
  { name: "Rope tricep pushdown", pattern: "tricep", role: "isolation", needs: "gym", lowImpact: true, family: "pushdown" },
  { name: "Overhead rope extension", pattern: "tricep", role: "isolation", needs: "gym", lowImpact: true, family: "tricep-ext" },
  { name: "EZ bar curl", pattern: "bicep", role: "isolation", needs: "gym", family: "curl" },
  { name: "Cable curl", pattern: "bicep", role: "isolation", needs: "gym", lowImpact: true },
  { name: "Leg extension", pattern: "quad-iso", role: "isolation", needs: "gym", lowImpact: true },
  { name: "Sissy squats", pattern: "quad-iso", role: "isolation", needs: "gym" },
  { name: "Lying hamstring curl", pattern: "ham-iso", role: "isolation", needs: "gym", lowImpact: true, family: "ham-curl" },
  { name: "Seated hamstring curl", pattern: "ham-iso", role: "isolation", needs: "gym", lowImpact: true, family: "ham-curl" },
  { name: "Hip thrust", pattern: "glute-iso", role: "isolation", needs: "gym", lowImpact: true, family: "hip-thrust" },
  { name: "Cable glute kickbacks", pattern: "glute-iso", role: "isolation", needs: "gym", lowImpact: true, perSide: true },
  { name: "Seated abductor machine", pattern: "glute-iso", role: "isolation", needs: "gym", lowImpact: true },
  { name: "Standing calf raise", pattern: "calf", role: "isolation", needs: "gym", lowImpact: true, family: "calf-raise" },
  { name: "Seated calf raise", pattern: "calf", role: "isolation", needs: "gym", lowImpact: true, family: "calf-raise" },
  { name: "Cable crunches", pattern: "core", role: "core", needs: "gym" },
  { name: "Hanging knee raises", pattern: "core", role: "core", needs: "gym" },
  { name: "Treadmill incline walk", pattern: "cardio", role: "cardio", needs: "gym", lowImpact: true },
  { name: "StairMaster", pattern: "cardio", role: "cardio", needs: "gym" },
  { name: "Rowing machine", pattern: "cardio", role: "cardio", needs: "gym", lowImpact: true },
  { name: "Elliptical", pattern: "cardio", role: "cardio", needs: "gym", lowImpact: true },
  { name: "Battle ropes", pattern: "conditioning", role: "conditioning", needs: "gym", hold: true },
  { name: "Kettlebell swings", pattern: "conditioning", role: "conditioning", needs: "gym" },
  { name: "Medicine ball slams", pattern: "conditioning", role: "conditioning", needs: "gym" },
  { name: "Box step-ups", pattern: "conditioning", role: "conditioning", needs: "gym", perSide: true },
  { name: "Rowing sprint", pattern: "conditioning", role: "conditioning", needs: "gym", metres: 300 },
];

/* ---------------------------------------------------------------
   Prescription
--------------------------------------------------------------- */

/**
 * Sets and reps, as ranges rather than fixed numbers.
 *
 * A range is what makes progressive overload possible: you work at the
 * bottom of it, add reps until you reach the top, then add weight and
 * drop back down. "4x8" gives you nowhere to go.
 */
const PRESCRIPTION: Record<
  Goal,
  { compound: string; isolation: string; core: string; hold: string }
> = {
  lose: { compound: "4 × 8–10", isolation: "3 × 12–15", core: "3 × 15", hold: "3 × 45–60 sec" },
  maintain: { compound: "4 × 8–10", isolation: "3 × 10–12", core: "3 × 15", hold: "3 × 40–60 sec" },
  gain: { compound: "4 × 6–8", isolation: "3 × 10–12", core: "3 × 12", hold: "3 × 45–60 sec" },
};

/** Minutes of cardio tacked onto a lifting day. */
const FINISHER_MINUTES: Record<Goal, number> = { lose: 20, maintain: 15, gain: 10 };

/** Minutes on a dedicated cardio day. */
const CARDIO_MINUTES: Record<Goal, number> = { lose: 30, maintain: 25, gain: 15 };

type Focus = {
  /** The movements the session is built around */
  compounds: Pattern[];
  /** Filled in after the compounds, as far as session size allows */
  isolation: Pattern[];
  /** How many core movements this day gets */
  core: number;
  /** Whether a cardio finisher is tacked on the end */
  finish: boolean;
};

const FOCUSES: Record<string, Focus> = {
  Push: {
    compounds: ["push", "push", "push"],
    isolation: ["chest-iso", "shoulder-iso", "tricep", "tricep"],
    core: 1,
    finish: true,
  },
  Pull: {
    compounds: ["pull", "pull", "pull"],
    isolation: ["back-iso", "back-iso", "bicep", "bicep"],
    core: 2,
    finish: true,
  },
  "Legs — quad focus": {
    compounds: ["squat", "squat", "lunge"],
    isolation: ["quad-iso", "calf", "ham-iso"],
    core: 0,
    finish: true,
  },
  "Legs — glute & hamstring": {
    compounds: ["hinge", "hinge"],
    isolation: ["glute-iso", "ham-iso", "glute-iso", "calf"],
    core: 2,
    finish: true,
  },
  "Upper body": {
    compounds: ["pull", "push", "pull", "push"],
    isolation: ["shoulder-iso", "bicep", "tricep"],
    core: 1,
    finish: true,
  },
  "Lower body": {
    compounds: ["squat", "hinge", "lunge"],
    isolation: ["quad-iso", "ham-iso", "calf"],
    core: 1,
    finish: true,
  },
  "Full body A": {
    compounds: ["squat", "push", "pull"],
    isolation: ["shoulder-iso", "bicep"],
    core: 1,
    finish: true,
  },
  "Full body B": {
    compounds: ["hinge", "push", "pull"],
    isolation: ["tricep", "calf"],
    core: 1,
    finish: true,
  },
  "Full body C": {
    compounds: ["lunge", "push", "pull"],
    isolation: ["back-iso", "shoulder-iso"],
    core: 1,
    finish: true,
  },
  "Conditioning + mobility": { compounds: [], isolation: [], core: 0, finish: false },
  "Cardio + core": { compounds: [], isolation: [], core: 3, finish: false },
};

/**
 * Which focus each training day gets.
 *
 * Fat loss keeps cardio and conditioning days in the week; muscle gain
 * spends those on another lift. Two leg days appear from five days up,
 * split quad-focus and posterior-chain — one leg day a week is where
 * most plans quietly under-train the biggest muscles you have.
 */
const SPLITS: Record<Goal, Record<number, string[]>> = {
  lose: {
    3: ["Full body A", "Cardio + core", "Full body B"],
    4: ["Upper body", "Cardio + core", "Lower body", "Full body A"],
    5: ["Push", "Pull", "Legs — quad focus", "Conditioning + mobility", "Legs — glute & hamstring"],
    6: [
      "Push",
      "Pull",
      "Legs — quad focus",
      "Conditioning + mobility",
      "Upper body",
      "Legs — glute & hamstring",
    ],
  },
  maintain: {
    3: ["Full body A", "Cardio + core", "Full body B"],
    4: ["Upper body", "Lower body", "Cardio + core", "Full body A"],
    5: ["Push", "Pull", "Legs — quad focus", "Upper body", "Legs — glute & hamstring"],
    6: [
      "Push",
      "Pull",
      "Legs — quad focus",
      "Conditioning + mobility",
      "Upper body",
      "Legs — glute & hamstring",
    ],
  },
  gain: {
    3: ["Full body A", "Full body B", "Full body C"],
    4: ["Push", "Pull", "Legs — quad focus", "Upper body"],
    5: ["Push", "Pull", "Legs — quad focus", "Upper body", "Legs — glute & hamstring"],
    6: ["Push", "Pull", "Legs — quad focus", "Push", "Upper body", "Legs — glute & hamstring"],
  },
};

/**
 * Which days of the week get trained.
 *
 * Spread so that rest is distributed rather than piled up at the end.
 * The four-day week used to be Mon/Tue/Thu/Fri, which finished on
 * Friday and left Saturday and Sunday both empty — the training week
 * was over before the weekend it was supposed to fit around, and two
 * consecutive rest days is where a habit goes to die. Saturday is the
 * day most people actually have time.
 *
 * Three days cannot avoid consecutive rest — four rest days into seven
 * will not spread — so Mon/Wed/Fri stays as the standard shape.
 */
const TRAINING_DAYS: Record<number, number[]> = {
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

const BASE_FREQUENCY: Record<ActivityLevel, number> = {
  sedentary: 3,
  light: 4,
  moderate: 4,
  active: 5,
  very_active: 5,
};

/**
 * How many movements go in a strength session, before core and cardio.
 *
 * This is the floor holding still while the ceiling rises. A beginner
 * gets four; someone already training hard gets seven, which is where a
 * session starts looking like a written programme.
 */
const SESSION_SIZE: Record<ActivityLevel, number> = {
  sedentary: 4,
  light: 5,
  moderate: 5,
  active: 7,
  very_active: 7,
};

/**
 * How many days a week this person should train.
 *
 * Someone sedentary starts at three. Handing a beginner six days is the
 * single most reliable way to get them to quit in week two — the plan
 * they follow beats the plan that is optimal on paper.
 */
export function trainingFrequency(activity: ActivityLevel, goal: Goal, age: number): number {
  let days = BASE_FREQUENCY[activity];
  if (goal === "gain") days = Math.min(6, days + 1);
  // Recovery slows with age, and the extra day costs more than it returns.
  if (age >= 55) days = Math.min(days, 4);
  return days;
}

export type WorkoutInput = {
  goal: Goal;
  activity: ActivityLevel;
  age: number;
  equipment: Equipment;
  /** Set when joints need protecting — older trainees, or a high BMI */
  lowImpactOnly: boolean;
};

/** How capable each tier of kit is, for preferring the best thing available. */
const TIER: Record<Equipment, number> = { none: 0, bands: 1, dumbbells: 2, gym: 3 };

function pool(pattern: Pattern, equipment: Equipment, lowImpactOnly: boolean): Exercise[] {
  const reachable = AVAILABLE[equipment];
  let candidates = EXERCISES.filter((e) => e.pattern === pattern && reachable.includes(e.needs));

  if (lowImpactOnly) {
    // Fall back to the full list rather than returning nothing — a shorter
    // list of harder movements beats an empty day.
    const gentle = candidates.filter((e) => e.lowImpact);
    if (gentle.length > 0) candidates = gentle;
  }

  if (candidates.length === 0) return candidates;

  /*
   * Use the best kit available for this movement. Someone who told us
   * they have a full gym should be squatting a barbell, not doing table
   * push-ups because those happen to sit earlier in the table.
   */
  const best = Math.max(...candidates.map((e) => TIER[e.needs]));
  const top = candidates.filter((e) => TIER[e.needs] === best);
  return top.length >= 2 ? top : candidates;
}

function prescribe(exercise: Exercise, goal: Goal): string {
  const p = PRESCRIPTION[goal];
  const side = exercise.perSide ? " each side" : "";

  if (exercise.metres) return `${exercise.name} – ${exercise.metres} m`;
  if (exercise.hold) return `${exercise.name} – ${p.hold}${side}`;
  if (exercise.role === "core") return `${exercise.name} – ${p.core}${side}`;
  if (exercise.role === "isolation") return `${exercise.name} – ${p.isolation}${side}`;
  return `${exercise.name} – ${p.compound}${side}`;
}

export function buildWorkout(input: WorkoutInput): { days: WorkoutDay[]; notes: string[] } {
  const { goal, activity, age, equipment, lowImpactOnly } = input;

  const frequency = trainingFrequency(activity, goal, age);
  const split = SPLITS[goal][frequency];
  const trainOn = TRAINING_DAYS[frequency];
  const sessionSize = SESSION_SIZE[activity];
  const finisherMinutes = FINISHER_MINUTES[goal];

  // Advances every time a pattern is used, so successive sessions walk
  // through that pattern's list instead of landing on the same entry.
  const patternCursor = new Map<Pattern, number>();
  let cardioMinutesTotal = 0;
  let strengthDays = 0;

  /**
   * Next exercise for a pattern.
   *
   * `strict` refuses any movement family already used today, so a day
   * cannot prescribe push-ups and knee push-ups — the same movement
   * made easier.
   */
  function take(
    pattern: Pattern,
    used: Set<string>,
    usedFamilies: Set<string>,
    strict: boolean,
  ): Exercise | null {
    const candidates = pool(pattern, equipment, lowImpactOnly);
    if (candidates.length === 0) return null;

    let index = (patternCursor.get(pattern) ?? 0) % candidates.length;

    for (let tries = 0; tries < candidates.length; tries++) {
      const candidate = candidates[index];
      const clash = strict && candidate.family && usedFamilies.has(candidate.family);

      if (!used.has(candidate.name) && !clash) {
        used.add(candidate.name);
        if (candidate.family) usedFamilies.add(candidate.family);
        patternCursor.set(pattern, index + 1);
        return candidate;
      }
      index = (index + 1) % candidates.length;
    }
    return null;
  }

  /**
   * What to reach for when a pattern is exhausted.
   *
   * A quad-focused leg day asks for two squats, which a full gym can
   * answer with a barbell squat and a leg press. Bodyweight cannot:
   * every bodyweight squat is the same movement at a different
   * difficulty, so the second slot would repeat the first. Rather than
   * accept that, the slot moves to a neighbouring pattern — a lunge
   * trains the same muscles and is a genuinely different exercise.
   */
  const SUBSTITUTES: Partial<Record<Pattern, Pattern[]>> = {
    squat: ["lunge", "quad-iso"],
    hinge: ["glute-iso", "ham-iso"],
    lunge: ["squat", "glute-iso"],
    push: ["chest-iso", "shoulder-iso", "tricep"],
    pull: ["back-iso", "bicep"],
    "chest-iso": ["shoulder-iso", "tricep"],
    "shoulder-iso": ["chest-iso", "tricep"],
    tricep: ["chest-iso", "shoulder-iso"],
    "back-iso": ["bicep"],
    bicep: ["back-iso"],
    "quad-iso": ["calf", "glute-iso"],
    "ham-iso": ["glute-iso", "calf"],
    "glute-iso": ["ham-iso", "calf"],
    calf: ["quad-iso", "glute-iso"],
  };

  /** Strict first, then a neighbouring pattern, then anything unused. */
  function pickFor(
    pattern: Pattern,
    used: Set<string>,
    usedFamilies: Set<string>,
  ): Exercise | null {
    const strict = take(pattern, used, usedFamilies, true);
    if (strict) return strict;

    for (const alternative of SUBSTITUTES[pattern] ?? []) {
      const swap = take(alternative, used, usedFamilies, true);
      if (swap) return swap;
    }

    // Nothing left that is genuinely different. A slightly redundant
    // exercise still beats leaving the day a movement short.
    return take(pattern, used, usedFamilies, false);
  }

  const days: WorkoutDay[] = DAYS.map((day, dayIndex) => {
    const slot = trainOn.indexOf(dayIndex);

    // Which rest day of the week this is, so the three do not collide on
    // the same wording the way day-of-week did.
    const restOrdinal = dayIndex - trainOn.filter((d) => d < dayIndex).length;

    if (slot === -1) {
      const restIdeas =
        goal === "lose"
          ? [
              ["A 20 minute easy walk if you feel like it", "Light stretching"],
              [
                "Stay on your feet where you can — a walk after dinner counts",
                "Hip and shoulder mobility, 10 min",
              ],
              [
                "Nothing planned. Sleep is the training you are doing today",
                "Gentle stretching if you feel stiff",
              ],
            ]
          : [
              ["Full rest — muscle is built on rest days"],
              ["Rest. Eat properly today; this is when the work turns into muscle"],
              ["Full rest, or 15 minutes of light stretching if you are restless"],
            ];

      return {
        day,
        focus: "Rest",
        rest: true,
        blocks: [{ name: "Recovery", items: restIdeas[restOrdinal % restIdeas.length] }],
      };
    }

    const focusName = split[slot];
    const focus = FOCUSES[focusName];
    const used = new Set<string>();
    const usedFamilies = new Set<string>();
    const blocks: WorkoutBlock[] = [];

    // ---- Conditioning day: rounds, not sets ----
    if (focusName === "Conditioning + mobility") {
      const items: string[] = [];
      for (let i = 0; i < 5; i++) {
        const pick = pickFor("conditioning", used, usedFamilies);
        if (!pick) break;
        items.push(
          pick.metres
            ? `${pick.name} – ${pick.metres} m`
            : pick.hold
              ? `${pick.name} – 30 sec`
              : `${pick.name} × 15${pick.perSide ? " each side" : ""}`,
        );
      }
      const cardio = pickFor("cardio", used, usedFamilies);
      if (cardio) items.push(`${cardio.name} – 3 min`);

      blocks.push({ name: "4 rounds, 90 sec rest between rounds", items });
      blocks.push({
        name: "Then",
        items: ["Mobility work – 10–15 min", "Full body stretching – 5 min"],
      });
      cardioMinutesTotal += 20;
      return { day, focus: focusName, blocks };
    }

    // ---- Dedicated cardio day ----
    if (focusName === "Cardio + core") {
      const cardio = pickFor("cardio", used, usedFamilies);
      const coreItems: string[] = [];
      for (let i = 0; i < focus.core; i++) {
        const pick = pickFor("core", used, usedFamilies);
        if (pick) coreItems.push(prescribe(pick, goal));
      }
      blocks.push({
        name: "Cardio",
        items: [cardio ? `${cardio.name} – ${CARDIO_MINUTES[goal]} min` : "Brisk walk – 30 min"],
      });
      if (coreItems.length) blocks.push({ name: "Core", items: coreItems });
      cardioMinutesTotal += CARDIO_MINUTES[goal];
      return { day, focus: focusName, blocks };
    }

    // ---- Strength day ----
    strengthDays++;
    const strength: string[] = [];

    for (const pattern of focus.compounds) {
      if (strength.length >= sessionSize) break;
      const pick = pickFor(pattern, used, usedFamilies);
      if (pick) strength.push(prescribe(pick, goal));
    }
    for (const pattern of focus.isolation) {
      if (strength.length >= sessionSize) break;
      const pick = pickFor(pattern, used, usedFamilies);
      if (pick) strength.push(prescribe(pick, goal));
    }

    blocks.push({ name: "Strength", items: strength });

    const coreItems: string[] = [];
    for (let i = 0; i < focus.core; i++) {
      const pick = pickFor("core", used, usedFamilies);
      if (pick) coreItems.push(prescribe(pick, goal));
    }
    if (coreItems.length) blocks.push({ name: "Core", items: coreItems });

    if (focus.finish) {
      const cardio = pickFor("cardio", used, usedFamilies);
      blocks.push({
        name: "Finish",
        items: [`${cardio ? cardio.name : "Brisk walk"} – ${finisherMinutes} min`],
      });
      cardioMinutesTotal += finisherMinutes;
    }

    return { day, focus: focusName, blocks };
  });

  /* ---- Notes ---- */

  // Roughly seven minutes a movement once warm-up sets and rest are in.
  const sessionMinutes = sessionSize * 7 + finisherMinutes;

  const notes = [
    `${frequency} training days a week, based on your activity level${
      goal === "gain" ? " and your goal of building muscle" : ""
    }. Build the habit at this frequency before adding more.`,
    `Every exercise here works with ${EQUIPMENT_LABEL[equipment]} — nothing in this plan needs kit you do not have.`,
    `Sessions should run about ${sessionMinutes - 15}–${sessionMinutes + 15} minutes including the finisher.`,
    `That comes to roughly ${cardioMinutesTotal} minutes of cardio a week across ${strengthDays} lifting days${
      strengthDays === frequency ? "" : " and your conditioning day"
    }, before any walking you do on rest days.`,
    "Progressive overload is the whole point: work at the bottom of the rep range, add reps until you reach the top of it, then add weight and start again. Keep 1–2 reps in reserve on most sets.",
    "Every 6–8 weeks take a lighter week — cut your sets by about a third and keep the same movements. You will come back stronger than if you had pushed through.",
    // Offered rather than prescribed. The form never asks whether you
    // own a bicycle or can reach a pool, so the plan cannot put either
    // in a session — but swapping the finisher for one is entirely
    // reasonable, and the person reading this knows what they can get to.
    "Swap any cardio finisher for cycling or swimming if you have access — same minutes, easier on the joints. The plan sticks to walking and jogging because it has no way of knowing what you can reach.",
  ];

  if (lowImpactOnly) {
    notes.push(
      "This plan uses low-impact movements to keep load off your knees and lower back. It is not an easier plan, it is a more durable one.",
    );
  }

  if (activity === "sedentary") {
    notes.push(
      "Starting from sedentary, expect the first two weeks to feel hard and the third to feel normal. Do not add days or exercises until that happens.",
    );
  }

  return { days, notes };
}
