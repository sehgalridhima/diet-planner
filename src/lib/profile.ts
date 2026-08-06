import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ActivityLevel, Goal, Sex, UserInput } from "@/lib/nutrition";
import type { DietType } from "@/lib/plan-types";

/* ===============================================================
   PROFILE — the data access layer
   ===============================================================
   Every read of a user's health data goes through here, and every
   one of them starts by asking Supabase who the user is. Row level
   security already scopes the rows, so this is the second lock
   rather than the only one — but it is the lock that sits next to
   the data, which is the one that matters.
   =============================================================== */

export type Profile = {
  id: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  /** A measured BMR, when the person has one. Undefined means use the formula. */
  measuredBmr?: number;
  activity: ActivityLevel;
  goal: Goal;
  diet: DietType;
  equipment: string;
  /** IANA zone from the browser, so "today" is the user's today */
  timezone: string;
};

type ProfileRow = {
  id: string;
  age: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  measured_bmr: number | null;
  activity: ActivityLevel;
  goal: Goal;
  diet: DietType;
  equipment: string;
  timezone: string;
};

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    age: row.age,
    sex: row.sex,
    heightCm: row.height_cm,
    weightKg: Number(row.weight_kg),
    measuredBmr: row.measured_bmr ?? undefined,
    activity: row.activity,
    goal: row.goal,
    diet: row.diet,
    equipment: row.equipment,
    timezone: row.timezone,
  };
}

/** The subset the nutrition engine cares about. */
export function toUserInput(profile: Profile): UserInput {
  return {
    age: profile.age,
    sex: profile.sex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    measuredBmr: profile.measuredBmr,
    activity: profile.activity,
    goal: profile.goal,
  };
}

export async function getUser() {
  // Accounts are optional. With no Supabase configured everyone is
  // simply anonymous, and the planner carries on as it always has.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Signed-in user or a redirect. Use at the top of every protected page. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[profile] read failed:", error.message);
    return null;
  }

  return data ? fromRow(data as ProfileRow) : null;
}

export type ProfileInput = Omit<Profile, "id">;

export async function saveProfile(input: ProfileInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { error: "You are not signed in." };

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    age: input.age,
    sex: input.sex,
    height_cm: input.heightCm,
    weight_kg: input.weightKg,
    measured_bmr: input.measuredBmr ?? null,
    activity: input.activity,
    goal: input.goal,
    diet: input.diet,
    equipment: input.equipment,
    timezone: input.timezone,
  });

  if (error) {
    console.error("[profile] save failed:", error.message);
    return { error: "Could not save your details. Please try again." };
  }

  return {};
}

export type WeightEntry = { loggedAt: string; weightKg: number };

/**
 * Records today's weight. Re-logging the same day corrects the
 * reading rather than adding a second one — a database trigger then
 * copies the latest weight onto the profile so targets follow it.
 */
export async function logWeight(weightKg: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { error: "You are not signed in." };

  const { error } = await supabase
    .from("weight_log")
    .upsert(
      { user_id: user.id, weight_kg: weightKg, logged_at: new Date().toISOString().slice(0, 10) },
      { onConflict: "user_id,logged_at" },
    );

  if (error) {
    console.error("[profile] weight log failed:", error.message);
    return { error: "Could not save that weight. Please try again." };
  }

  return {};
}

export async function getWeightLog(limit = 30): Promise<WeightEntry[]> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("weight_log")
    .select("logged_at, weight_kg")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[profile] weight log read failed:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    loggedAt: r.logged_at as string,
    weightKg: Number(r.weight_kg),
  }));
}

/**
 * Deletes the account and everything attached to it.
 *
 * Both tables cascade from auth.users, but we cannot delete an auth
 * user with the anon key — that needs the service role. So this
 * clears the health data, which is the part that matters, and then
 * signs out. Removing the auth record itself is a separate admin
 * step; see the note in the README.
 */
export async function deleteAccountData(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { error: "You are not signed in." };

  const weights = await supabase.from("weight_log").delete().eq("user_id", user.id);
  const profile = await supabase.from("profiles").delete().eq("id", user.id);

  if (weights.error || profile.error) {
    console.error("[profile] delete failed:", weights.error?.message ?? profile.error?.message);
    return { error: "Could not delete your data. Please try again." };
  }

  await supabase.auth.signOut();
  return {};
}
