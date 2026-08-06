import { DAYS, type WorkoutDay } from "@/lib/plan-types";
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

type Pattern = "squat" | "hinge" | "lunge" | "push" | "pull" | "core" | "cardio";

export type Exercise = {
  name: string;
  pattern: Pattern;
  needs: Equipment;
  /** Safe on knees, back and joints — what we fall back to for older or heavier trainees */
  lowImpact?: boolean;
  /** Core work measured in seconds rather than reps */
  hold?: boolean;
};

export const EXERCISES: Exercise[] = [
  // ---- Bodyweight: available to everyone ----
  { name: "Bodyweight squats", pattern: "squat", needs: "none" },
  { name: "Chair squats", pattern: "squat", needs: "none", lowImpact: true },
  { name: "Wall sit", pattern: "squat", needs: "none", lowImpact: true, hold: true },
  { name: "Glute bridges", pattern: "hinge", needs: "none", lowImpact: true },
  { name: "Single-leg glute bridge", pattern: "hinge", needs: "none", lowImpact: true },
  { name: "Bodyweight good mornings", pattern: "hinge", needs: "none", lowImpact: true },
  { name: "Reverse lunges", pattern: "lunge", needs: "none" },
  { name: "Split squats", pattern: "lunge", needs: "none" },
  { name: "Step-ups onto a sturdy chair", pattern: "lunge", needs: "none", lowImpact: true },
  { name: "Push-ups", pattern: "push", needs: "none" },
  { name: "Incline push-ups against a table", pattern: "push", needs: "none", lowImpact: true },
  { name: "Knee push-ups", pattern: "push", needs: "none", lowImpact: true },
  { name: "Pike push-ups", pattern: "push", needs: "none" },
  { name: "Close-grip push-ups", pattern: "push", needs: "none" },
  { name: "Towel rows in a doorway", pattern: "pull", needs: "none" },
  { name: "Superman holds", pattern: "pull", needs: "none", lowImpact: true, hold: true },
  { name: "Prone Y-T-W raises", pattern: "pull", needs: "none", lowImpact: true },
  { name: "Plank", pattern: "core", needs: "none", lowImpact: true, hold: true },
  { name: "Side plank", pattern: "core", needs: "none", lowImpact: true, hold: true },
  { name: "Dead bug", pattern: "core", needs: "none", lowImpact: true },
  { name: "Bird dog", pattern: "core", needs: "none", lowImpact: true },
  { name: "Leg raises", pattern: "core", needs: "none" },
  { name: "Crunches", pattern: "core", needs: "none" },
  { name: "Brisk walk", pattern: "cardio", needs: "none", lowImpact: true },
  { name: "Cycling", pattern: "cardio", needs: "none", lowImpact: true },
  { name: "Swimming", pattern: "cardio", needs: "none", lowImpact: true },
  { name: "Jog", pattern: "cardio", needs: "none" },
  { name: "Stair climbing", pattern: "cardio", needs: "none" },
  { name: "Skipping", pattern: "cardio", needs: "none" },

  // ---- Resistance bands ----
  { name: "Band squats", pattern: "squat", needs: "bands", lowImpact: true },
  { name: "Band deadlifts", pattern: "hinge", needs: "bands", lowImpact: true },
  { name: "Band chest press", pattern: "push", needs: "bands", lowImpact: true },
  { name: "Band shoulder press", pattern: "push", needs: "bands", lowImpact: true },
  { name: "Band rows", pattern: "pull", needs: "bands", lowImpact: true },
  { name: "Band lat pulldown", pattern: "pull", needs: "bands", lowImpact: true },
  { name: "Band face pulls", pattern: "pull", needs: "bands", lowImpact: true },

  // ---- Dumbbells at home ----
  { name: "Goblet squats", pattern: "squat", needs: "dumbbells" },
  { name: "Dumbbell front squat", pattern: "squat", needs: "dumbbells" },
  { name: "Dumbbell Romanian deadlift", pattern: "hinge", needs: "dumbbells" },
  { name: "Dumbbell sumo deadlift", pattern: "hinge", needs: "dumbbells" },
  { name: "Dumbbell lunges", pattern: "lunge", needs: "dumbbells" },
  { name: "Dumbbell step-ups", pattern: "lunge", needs: "dumbbells", lowImpact: true },
  { name: "Dumbbell bench press", pattern: "push", needs: "dumbbells" },
  { name: "Dumbbell shoulder press", pattern: "push", needs: "dumbbells" },
  { name: "Dumbbell floor press", pattern: "push", needs: "dumbbells", lowImpact: true },
  { name: "Dumbbell rows", pattern: "pull", needs: "dumbbells" },
  { name: "Dumbbell reverse fly", pattern: "pull", needs: "dumbbells", lowImpact: true },
  { name: "Dumbbell curls", pattern: "pull", needs: "dumbbells", lowImpact: true },
  { name: "Suitcase carry", pattern: "core", needs: "dumbbells", lowImpact: true },

  // ---- Full gym ----
  { name: "Barbell back squat", pattern: "squat", needs: "gym" },
  { name: "Leg press", pattern: "squat", needs: "gym", lowImpact: true },
  { name: "Barbell deadlift", pattern: "hinge", needs: "gym" },
  { name: "Romanian deadlift", pattern: "hinge", needs: "gym" },
  { name: "Back extensions", pattern: "hinge", needs: "gym", lowImpact: true },
  { name: "Walking lunges", pattern: "lunge", needs: "gym" },
  { name: "Bulgarian split squats", pattern: "lunge", needs: "gym" },
  { name: "Barbell bench press", pattern: "push", needs: "gym" },
  { name: "Incline barbell press", pattern: "push", needs: "gym" },
  { name: "Machine chest press", pattern: "push", needs: "gym", lowImpact: true },
  { name: "Pull-ups", pattern: "pull", needs: "gym" },
  { name: "Lat pulldown", pattern: "pull", needs: "gym", lowImpact: true },
  { name: "Seated cable row", pattern: "pull", needs: "gym", lowImpact: true },
  { name: "Barbell rows", pattern: "pull", needs: "gym" },
  { name: "Cable crunches", pattern: "core", needs: "gym" },
  { name: "Hanging leg raises", pattern: "core", needs: "gym" },
  { name: "Treadmill incline walk", pattern: "cardio", needs: "gym", lowImpact: true },
  { name: "Rowing machine", pattern: "cardio", needs: "gym", lowImpact: true },
  { name: "Elliptical", pattern: "cardio", needs: "gym", lowImpact: true },
];

/** Sets and reps follow the goal: lighter and longer to lose, heavier to build. */
const REPS: Record<Goal, { strength: string; core: string; hold: string }> = {
  lose: { strength: "3x12", core: "3x15", hold: "3x30s" },
  maintain: { strength: "3x10", core: "3x15", hold: "3x40s" },
  gain: { strength: "4x8", core: "3x12", hold: "3x45s" },
};

/** Cardio minutes. Deliberately low on a gain plan — you eat the surplus to use it. */
const CARDIO_MINUTES: Record<Goal, number> = { lose: 30, maintain: 25, gain: 15 };

const FOCUS_PATTERNS: Record<string, Pattern[]> = {
  "Full body A": ["squat", "push", "pull", "core"],
  "Full body B": ["hinge", "push", "pull", "core"],
  "Full body C": ["lunge", "push", "pull", "core"],
  "Upper body": ["push", "pull", "push", "core"],
  "Lower body": ["squat", "hinge", "lunge", "core"],
  Push: ["push", "push", "push", "core"],
  Pull: ["pull", "pull", "pull", "core"],
  Legs: ["squat", "hinge", "lunge", "core"],
  "Cardio + core": ["cardio", "core", "core"],
};

/**
 * Which focus each training day gets. Fat loss keeps cardio days in the
 * week; muscle gain spends those days on another lift instead.
 */
const SPLITS: Record<Goal, Record<number, string[]>> = {
  lose: {
    3: ["Full body A", "Cardio + core", "Full body B"],
    4: ["Upper body", "Cardio + core", "Lower body", "Full body A"],
    5: ["Full body A", "Cardio + core", "Lower body", "Upper body", "Cardio + core"],
    6: ["Full body A", "Cardio + core", "Lower body", "Cardio + core", "Upper body", "Cardio + core"],
  },
  maintain: {
    3: ["Full body A", "Cardio + core", "Full body B"],
    4: ["Upper body", "Lower body", "Cardio + core", "Full body A"],
    5: ["Upper body", "Lower body", "Cardio + core", "Push", "Pull"],
    6: ["Push", "Pull", "Legs", "Cardio + core", "Upper body", "Lower body"],
  },
  gain: {
    3: ["Full body A", "Full body B", "Full body C"],
    4: ["Push", "Pull", "Legs", "Upper body"],
    5: ["Push", "Pull", "Legs", "Upper body", "Lower body"],
    6: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"],
  },
};

/** Which days of the week get trained, so rest lands sensibly rather than all at the end. */
const TRAINING_DAYS: Record<number, number[]> = {
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
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
   * Use the best kit available for this movement. Someone who told us they
   * have a full gym should be squatting a barbell, not doing table push-ups
   * because those happen to sit earlier in the table.
   *
   * Two options is the threshold: below that the week would show the same
   * exercise every session, which is worse than dropping a tier.
   */
  const best = Math.max(...candidates.map((e) => TIER[e.needs]));
  const top = candidates.filter((e) => TIER[e.needs] === best);
  return top.length >= 2 ? top : candidates;
}

function format(exercise: Exercise, goal: Goal): string {
  if (exercise.pattern === "cardio") {
    return `${exercise.name}, ${CARDIO_MINUTES[goal]} min`;
  }
  if (exercise.hold) return `${exercise.name} ${REPS[goal].hold}`;
  if (exercise.pattern === "core") return `${exercise.name} ${REPS[goal].core}`;
  return `${exercise.name} ${REPS[goal].strength}`;
}

export function buildWorkout(input: WorkoutInput): { days: WorkoutDay[]; notes: string[] } {
  const { goal, activity, age, equipment, lowImpactOnly } = input;

  const frequency = trainingFrequency(activity, goal, age);
  const split = SPLITS[goal][frequency];
  const trainOn = TRAINING_DAYS[frequency];

  const days: WorkoutDay[] = DAYS.map((day, dayIndex) => {
    const slot = trainOn.indexOf(dayIndex);

    if (slot === -1) {
      return {
        day,
        focus: "Rest",
        rest: true,
        exercises:
          goal === "lose"
            ? ["A 20 minute easy walk if you feel like it", "Light stretching"]
            : ["Full rest — muscle is built on rest days"],
      };
    }

    const focus = split[slot];
    const used = new Set<string>();
    const exercises: string[] = [];

    FOCUS_PATTERNS[focus].forEach((pattern, position) => {
      const candidates = pool(pattern, equipment, lowImpactOnly);
      if (candidates.length === 0) return;

      // Offset by the day so Friday's push day is not a copy of Monday's,
      // then walk forward past anything already used today.
      let index = (slot * 3 + position) % candidates.length;
      for (let tries = 0; tries < candidates.length; tries++) {
        const candidate = candidates[index];
        if (!used.has(candidate.name)) {
          used.add(candidate.name);
          exercises.push(format(candidate, goal));
          return;
        }
        index = (index + 1) % candidates.length;
      }
    });

    return { day, focus, exercises };
  });

  const notes = [
    `${frequency} training days a week, based on your activity level${
      goal === "gain" ? " and your goal of building muscle" : ""
    }. Build the habit at this frequency before adding more.`,
    `Every exercise here works with ${EQUIPMENT_LABEL[equipment]} — nothing in this plan needs kit you do not have.`,
  ];

  if (lowImpactOnly) {
    notes.push(
      "This plan uses low-impact movements to keep load off your knees and lower back. It is not an easier plan, it is a more durable one.",
    );
  }

  if (activity === "sedentary") {
    notes.push(
      "Starting from sedentary, expect the first two weeks to feel hard and the third to feel normal. Do not add days until that happens.",
    );
  }

  notes.push(
    "Add a little weight or one rep when the last set stops being difficult. That progression, not the exercise list, is what changes your body.",
  );

  return { days, notes };
}
