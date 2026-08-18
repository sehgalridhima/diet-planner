import { LIMITS } from "@/lib/nutrition";

/* ===============================================================
   PENDING PLAN — carrying what you typed through sign-in
   ===============================================================
   Someone who fills the form without an account has already given
   us everything a profile needs. Making them type it a second time
   after signing in is the exact retyping the account exists to end.

   So "Save this plan" puts the answers here, sends them to sign in,
   and the profile form on the other side comes back filled in.

   Two decisions worth stating, because both were the point of the
   feature:

   IT IS THE BROWSER'S, NOT OURS. This is localStorage, not a row in
   a table. Nothing about a visitor reaches the database until they
   have signed in and pressed Save on a form showing them exactly
   what is about to be stored. A "save this" button that had already
   saved it would be the kind of thing that makes people stop
   trusting a health app.

   IT ONLY SURVIVES THE SAME BROWSER. Open the sign-in email on your
   phone after filling the form on a laptop and the stash is not
   there — you get an empty form and type it once. That is the
   graceful version of this failing, and it is why nothing downstream
   may assume the stash exists.
   =============================================================== */

const KEY = "diet-planner:pending-profile:1";

/** How long a stash is worth keeping. Long enough for an email to arrive. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PendingProfile = {
  age: string;
  sex: string;
  heightCm: string;
  weightKg: string;
  measuredBmr: string;
  activity: string;
  goal: string;
  diet: string;
  cuisine: string;
  equipment: string;
  craving: string;
};

type Stashed = { saved: number; profile: PendingProfile };

const FIELDS: (keyof PendingProfile)[] = [
  "age",
  "sex",
  "heightCm",
  "weightKg",
  "measuredBmr",
  "activity",
  "goal",
  "diet",
  "cuisine",
  "equipment",
  "craving",
];

export function stashProfile(profile: PendingProfile): void {
  try {
    const payload: Stashed = { saved: Date.now(), profile };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /*
     * Private browsing and a full quota both throw here. Losing the
     * stash costs someone one retype; throwing would cost them the
     * sign-in they were part-way through.
     */
  }
}

/**
 * Reads the stash back, or null.
 *
 * Everything is re-checked rather than trusted. This is a string a
 * user could have edited, left over from an older version of the
 * form, or sat on for a week — and it goes straight into the fields
 * of a form about their body.
 */
export function readStashedProfile(): PendingProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<Stashed>;
    if (typeof parsed?.saved !== "number" || Date.now() - parsed.saved > MAX_AGE_MS) {
      clearStashedProfile();
      return null;
    }

    const profile = parsed.profile;
    if (!profile || typeof profile !== "object") return null;

    const out = {} as PendingProfile;
    for (const field of FIELDS) {
      const value = profile[field];
      out[field] = typeof value === "string" ? value.slice(0, 120) : "";
    }

    // The numbers have to be inside the same bounds the form enforces,
    // or we would be prefilling a field with something it will refuse.
    const withinLimits =
      inRange(out.age, LIMITS.age) &&
      inRange(out.heightCm, LIMITS.heightCm) &&
      inRange(out.weightKg, LIMITS.weightKg) &&
      (out.measuredBmr === "" || inRange(out.measuredBmr, LIMITS.measuredBmr));

    return withinLimits ? out : null;
  } catch {
    return null;
  }
}

export function clearStashedProfile(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* Nothing useful to do — see stashProfile. */
  }
}

function inRange(value: string, limit: { min: number; max: number }): boolean {
  const n = Number(value);
  return value !== "" && Number.isFinite(n) && n >= limit.min && n <= limit.max;
}
