"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  deleteAccountData,
  logWeight,
  saveProfile,
  type ProfileInput,
} from "@/lib/profile";
import type { ActivityLevel, Goal, Sex } from "@/lib/nutrition";
import type { DietType } from "@/lib/plan-types";

/* ===============================================================
   SERVER ACTIONS
   ===============================================================
   Form values arrive as strings from an untrusted client, so each
   one is parsed and range-checked here before it reaches the
   database. The column CHECK constraints in the migration are the
   backstop, not the validation.
   =============================================================== */

const SEXES: Sex[] = ["female", "male"];
const ACTIVITIES: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const GOALS: Goal[] = ["lose", "maintain", "gain"];
const DIETS: DietType[] = ["veg", "egg", "nonveg", "vegan"];

function pick<T extends string>(value: FormDataEntryValue | null, allowed: T[]): T | null {
  const s = String(value ?? "");
  return (allowed as string[]).includes(s) ? (s as T) : null;
}

function number(value: FormDataEntryValue | null, min: number, max: number): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export async function saveProfileAction(_prev: unknown, formData: FormData) {
  const age = number(formData.get("age"), 13, 100);
  const heightCm = number(formData.get("heightCm"), 120, 230);
  const weightKg = number(formData.get("weightKg"), 30, 300);
  const sex = pick(formData.get("sex"), SEXES);

  // Optional: blank means "use the formula", not zero.
  const rawBmr = String(formData.get("measuredBmr") ?? "").trim();
  const measuredBmr = rawBmr === "" ? undefined : number(rawBmr, 600, 4500);
  if (rawBmr !== "" && measuredBmr === null) {
    return { error: "A measured BMR should be between 600 and 4500 kcal, or left blank." };
  }

  const activity = pick(formData.get("activity"), ACTIVITIES);
  const goal = pick(formData.get("goal"), GOALS);
  const diet = pick(formData.get("diet"), DIETS);
  const equipment = String(formData.get("equipment") ?? "Bodyweight only").slice(0, 120);

  // Sent by a hidden field the browser fills in, because the server
  // runs in UTC and would roll the plan over at 5:30am in India.
  const rawZone = String(formData.get("timezone") ?? "").slice(0, 60);
  const timezone = /^[A-Za-z_+-]+\/[A-Za-z_+-]+/.test(rawZone) ? rawZone : "Asia/Kolkata";

  if (!age || !heightCm || !weightKg || !sex || !activity || !goal || !diet) {
    return { error: "Please check every field and try again." };
  }

  const input: ProfileInput = {
    age,
    sex,
    heightCm,
    weightKg,
    measuredBmr: measuredBmr ?? undefined,
    activity,
    goal,
    diet,
    equipment,
    timezone,
  };

  const { error } = await saveProfile(input);
  if (error) return { error };

  revalidatePath("/today");
  revalidatePath("/profile");
  redirect("/today");
}

export async function logWeightAction(_prev: unknown, formData: FormData) {
  const weightKg = number(formData.get("weightKg"), 30, 300);
  if (!weightKg) return { error: "That does not look like a weight in kilograms." };

  const { error } = await logWeight(weightKg);
  if (error) return { error };

  revalidatePath("/today");
  revalidatePath("/profile");
  return { ok: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function deleteAccountAction() {
  const { error } = await deleteAccountData();
  // Used directly as a form action, so it reports through the URL
  // rather than returning a value the form has no way to render.
  if (error) redirect("/profile?error=delete");
  redirect("/?deleted=1");
}
