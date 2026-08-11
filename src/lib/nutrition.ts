/* ===============================================================
   NUTRITION MATH
   ===============================================================
   Every number a user sees comes from this file, not from an AI
   model. Calorie targets have to be correct and repeatable, so they
   are calculated with published formulas and clamped to safe floors.

   The AI is only allowed to decide *which foods* fill the targets
   this file produces.
   =============================================================== */

export type Sex = "female" | "male";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type Goal = "lose" | "maintain" | "gain";

export type UserInput = {
  age: number;
  sex: Sex;
  /** centimetres */
  heightCm: number;
  /** kilograms */
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  /**
   * A measured BMR, if the person has one — from a smart scale, a
   * metabolic cart, or a DEXA scan.
   *
   * Mifflin-St Jeor is a population estimate and can be 10–15% out for
   * any individual, so a real measurement beats it whenever one exists.
   * Left undefined, everything falls back to the formula exactly as
   * before.
   */
  measuredBmr?: number;
};

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  label: string;
  hint: string;
  multiplier: number;
}[] = [
  {
    value: "sedentary",
    label: "Sedentary",
    hint: "Desk job, little or no exercise",
    multiplier: 1.2,
  },
  {
    value: "light",
    label: "Lightly active",
    hint: "Light exercise 1–3 days a week",
    multiplier: 1.375,
  },
  {
    value: "moderate",
    label: "Moderately active",
    hint: "Moderate exercise 3–5 days a week",
    multiplier: 1.55,
  },
  {
    value: "active",
    label: "Very active",
    hint: "Hard exercise 6–7 days a week",
    multiplier: 1.725,
  },
  {
    value: "very_active",
    label: "Extremely active",
    hint: "Physical job, or training twice a day",
    multiplier: 1.9,
  },
];

/**
 * Lowest daily calorie intake we will ever recommend.
 * Widely used clinical floors for unsupervised dieting.
 */
const CALORIE_FLOOR: Record<Sex, number> = {
  female: 1200,
  male: 1500,
};

/** Cap the deficit so weight loss stays near 0.5–0.75 kg per week */
const MAX_DAILY_DEFICIT = 750;
/** A surplus much larger than this becomes fat, not muscle */
const MAX_DAILY_SURPLUS = 400;

export type Macros = {
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type BmrSource = "measured" | "estimated";

export type NutritionPlan = {
  /** The BMR actually used — measured if one was given, else estimated */
  bmr: number;
  /** Where that number came from, so the UI never has to guess */
  bmrSource: BmrSource;
  /** What Mifflin-St Jeor predicts, kept for comparison */
  estimatedBmr: number;
  tdee: number;
  /** Daily calorie target after the goal adjustment and safety clamp */
  calories: number;
  macros: Macros;
  bmi: number;
  bmiCategory: string;
  /** Healthy weight range for this height, in kg */
  healthyWeightRange: { min: number; max: number };
  /** Roughly how much weight changes per week at this target */
  weeklyChangeKg: number;
  /** Anything the user should know before following the plan */
  warnings: string[];
  /** True when the calorie floor overrode the requested deficit */
  clampedToFloor: boolean;
};

/**
 * Mifflin-St Jeor equation — the current standard for estimating
 * resting energy expenditure, and more accurate than Harris-Benedict
 * for most people.
 */
export function calculateBMR(input: UserInput): number {
  const { weightKg, heightCm, age, sex } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/**
 * The BMR everything downstream should use: the measured one when it
 * has been given, the formula otherwise.
 *
 * Kept separate from calculateBMR so the estimate stays available for
 * comparison — a measured value wildly adrift of the formula is more
 * likely a typo or a wrong unit than a remarkable metabolism, and we
 * warn about it rather than silently building a plan on it.
 */
export function effectiveBMR(input: UserInput): number {
  return input.measuredBmr ?? calculateBMR(input);
}

/** Total daily energy expenditure — BMR scaled by how active someone is */
export function calculateTDEE(input: UserInput): number {
  const bmr = effectiveBMR(input);
  const option = ACTIVITY_OPTIONS.find((o) => o.value === input.activity);
  return bmr * (option?.multiplier ?? 1.2);
}

export function calculateBMI(input: UserInput): number {
  const heightM = input.heightCm / 100;
  return input.weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

/** The weight range that puts this height in the healthy BMI band */
export function healthyWeightRange(heightCm: number): {
  min: number;
  max: number;
} {
  const heightM = heightCm / 100;
  return {
    min: Math.round(18.5 * heightM * heightM),
    max: Math.round(24.9 * heightM * heightM),
  };
}

/**
 * Splits a calorie target into grams of protein, carbs and fat.
 *
 * Protein is set per kilogram of bodyweight rather than as a
 * percentage, because that is what the evidence is actually based on,
 * and it protects muscle while in a deficit. Fat is held at a
 * quarter of intake with a floor, since it is needed for hormones.
 * Carbohydrate takes whatever is left.
 */
export function calculateMacros(
  calories: number,
  weightKg: number,
  goal: Goal,
  /**
   * Weight to base protein on. For someone above a healthy weight this
   * should be the top of their healthy range, not what they weigh now —
   * stored body fat has no protein requirement, so using current weight
   * sets a target that is both unnecessary and, on a vegetarian Indian
   * diet at a deficit, close to unreachable.
   */
  referenceWeightKg: number = weightKg,
): Macros {
  const proteinPerKg = goal === "lose" ? 1.8 : goal === "gain" ? 1.7 : 1.4;
  const fromWeight = Math.round(referenceWeightKg * proteinPerKg);

  /*
   * Cap protein as a share of the day's calories.
   *
   * 1.8 g/kg is a defensible target for holding on to muscle in a
   * deficit, but it says nothing about how many calories you have to
   * spend. On a small calorie target it lands at 35% of the day, and
   * at that density an Indian vegetarian plan stops being food: curd
   * or paneer has to appear in almost every meal, with a scoop of
   * whey to close the gap. The grams are technically met and the plan
   * is not one anybody would follow.
   *
   * Thirty percent still protects muscle and leaves room for a normal
   * plate. The floor stops the cap dropping protein somewhere it
   * would actually do harm.
   */
  const capFromCalories = Math.round((calories * 0.3) / 4);
  const floorFromWeight = Math.round(referenceWeightKg * 1.2);
  const proteinG = Math.max(floorFromWeight, Math.min(fromWeight, capFromCalories));

  const fatFromPercent = (calories * 0.25) / 9;
  const fatFloor = weightKg * 0.7;
  const fatG = Math.round(Math.max(fatFromPercent, fatFloor));

  const remainingCalories = calories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(remainingCalories / 4));

  return { proteinG, carbsG, fatG };
}

/**
 * Builds the full set of targets, including every safety check.
 * This is the only function the rest of the app should need.
 */
export function buildNutritionPlan(input: UserInput): NutritionPlan {
  const bmr = Math.round(effectiveBMR(input));
  const estimatedBmr = Math.round(calculateBMR(input));
  const bmrSource: BmrSource = input.measuredBmr ? "measured" : "estimated";
  const tdee = Math.round(calculateTDEE(input));
  const bmi = calculateBMI(input);
  const category = bmiCategory(bmi);
  const warnings: string[] = [];

  // Apply the goal
  let target = tdee;
  if (input.goal === "lose") {
    target = tdee - Math.min(tdee * 0.2, MAX_DAILY_DEFICIT);
  } else if (input.goal === "gain") {
    target = tdee + Math.min(tdee * 0.12, MAX_DAILY_SURPLUS);
  }

  // Never go below the clinical floor.
  //
  // Note: we deliberately do NOT floor this at BMR. A sedentary person's
  // TDEE is only 1.2x their BMR, so any real deficit lands below BMR —
  // flooring there would hand an overweight person a near-zero deficit.
  // Eating under BMR while active is normal; the 1200/1500 floor is the
  // guardrail that actually matters.
  const floor = CALORIE_FLOOR[input.sex];
  let clampedToFloor = false;
  if (target < floor) {
    target = floor;
    clampedToFloor = true;
  }

  const calories = Math.round(target / 10) * 10;
  const weeklyChangeKg = Number((((calories - tdee) * 7) / 7700).toFixed(2));

  // ---- Safety checks -------------------------------------------------

  if (clampedToFloor) {
    warnings.push(
      "Your target was raised to a safe minimum. Eating less than this makes it hard to get enough nutrients, and tends to backfire.",
    );
  }

  if (bmi >= 18.5 && bmi < 25 && input.goal === "lose") {
    warnings.push(
      "You're already in the healthy weight range. Losing more is fine if that's what you want, but recomposition — keeping the weight and building strength — usually gets people the look they're actually after.",
    );
  }

  if (bmi < 18.5 && input.goal === "lose") {
    warnings.push(
      "Your BMI is already below the healthy range, so losing weight isn't recommended. Please talk to a doctor before starting any deficit.",
    );
  }

  if (bmi < 16) {
    warnings.push(
      "Your BMI is very low. Please speak to a doctor before making changes to how you eat.",
    );
  }

  if (bmi >= 35) {
    warnings.push(
      "At this BMI, working with a doctor or dietitian alongside this plan will get you better and safer results.",
    );
  }

  /*
   * A measured BMR should be close to the formula. Real individual
   * variation runs to maybe 15%; a number 25% adrift is far more often
   * a typo, a resting heart-rate reading, or a device reporting TDEE
   * and calling it BMR. We use what was given — it is their data — but
   * we say plainly that it looks wrong, because every calorie number
   * below it inherits the error.
   */
  if (bmrSource === "measured") {
    const drift = Math.round(((bmr - estimatedBmr) / estimatedBmr) * 100);
    if (Math.abs(drift) >= 25) {
      warnings.push(
        `The BMR you entered (${bmr} kcal) is ${Math.abs(drift)}% ${
          drift > 0 ? "higher" : "lower"
        } than the ${estimatedBmr} kcal your height, weight, age and sex predict. That is a big gap — worth checking you have not entered your total daily burn instead of your resting rate. Your plan is built on the number you gave.`,
      );
    }
  }

  if (input.age < 18) {
    warnings.push(
      "These formulas are built for adults. If you're under 18, please check with a doctor before following a calorie target.",
    );
  }

  if (input.age > 65) {
    warnings.push(
      "Over 65, protein and muscle maintenance matter more than the calorie number. Worth reviewing this plan with your doctor.",
    );
  }

  // Protein is based on the top of the healthy weight range when someone is
  // above it — see calculateMacros. Below or inside the range, actual weight.
  const range = healthyWeightRange(input.heightCm);
  const referenceWeightKg = Math.min(input.weightKg, range.max);

  return {
    bmr,
    bmrSource,
    estimatedBmr,
    tdee,
    calories,
    macros: calculateMacros(calories, input.weightKg, input.goal, referenceWeightKg),
    bmi: Number(bmi.toFixed(1)),
    bmiCategory: category,
    healthyWeightRange: healthyWeightRange(input.heightCm),
    weeklyChangeKg,
    warnings,
    clampedToFloor,
  };
}

/* ---------------------------------------------------------------
   Input validation — the form and the API both use this, so bad
   numbers can never reach the calculations.
--------------------------------------------------------------- */

export const LIMITS = {
  age: { min: 13, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 300 },
  /*
   * Wide on purpose. This is a hard reject for values that cannot be a
   * BMR at all; the 25% drift warning is what catches the merely
   * suspicious ones. Rejecting a real outlier outright would be worse
   * than flagging it.
   */
  measuredBmr: { min: 600, max: 4500 },
};

export function validateInput(input: Partial<UserInput>): string[] {
  const errors: string[] = [];

  const check = (
    value: unknown,
    key: keyof typeof LIMITS,
    label: string,
    unit: string,
  ) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      errors.push(`${label} is required.`);
      return;
    }
    const { min, max } = LIMITS[key];
    if (value < min || value > max) {
      errors.push(`${label} should be between ${min} and ${max} ${unit}.`);
    }
  };

  check(input.age, "age", "Age", "years");
  check(input.heightCm, "heightCm", "Height", "cm");
  check(input.weightKg, "weightKg", "Weight", "kg");

  if (input.sex !== "female" && input.sex !== "male") {
    errors.push("Please select an option for sex.");
  }
  if (!ACTIVITY_OPTIONS.some((o) => o.value === input.activity)) {
    errors.push("Please select your activity level.");
  }
  if (!["lose", "maintain", "gain"].includes(input.goal ?? "")) {
    errors.push("Please select a goal.");
  }

  // Optional: absent is fine, present but nonsensical is not.
  if (input.measuredBmr !== undefined && input.measuredBmr !== null) {
    const { min, max } = LIMITS.measuredBmr;
    if (
      typeof input.measuredBmr !== "number" ||
      Number.isNaN(input.measuredBmr) ||
      input.measuredBmr < min ||
      input.measuredBmr > max
    ) {
      errors.push(`If you enter a measured BMR it should be between ${min} and ${max} kcal.`);
    }
  }

  return errors;
}
