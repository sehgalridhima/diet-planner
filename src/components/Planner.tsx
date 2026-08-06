"use client";

import { useState } from "react";
import { ACTIVITY_OPTIONS, type NutritionPlan } from "@/lib/nutrition";
import { DIET_OPTIONS, type DietType, type MealPlan } from "@/lib/plan-types";
import { EQUIPMENT_OPTIONS } from "@/lib/workout-planner";
import PlanView from "@/components/PlanView";

type HeightUnit = "cm" | "ft";

type ApiResponse = {
  plan: MealPlan;
  nutrition: NutritionPlan;
  cached: boolean;
  notice?: string;
  error?: string;
};

const GOALS = [
  { value: "lose", label: "Lose fat" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Build muscle" },
] as const;

const EQUIPMENT = EQUIPMENT_OPTIONS.map((o) => o.label);

export default function Planner() {
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [form, setForm] = useState({
    age: "",
    sex: "female",
    heightCm: "",
    feet: "",
    inches: "",
    weightKg: "",
    measuredBmr: "",
    activity: "sedentary",
    goal: "lose",
    diet: "veg" as DietType,
    equipment: "Bodyweight only",
  });

  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function resolvedHeightCm(): number {
    if (heightUnit === "cm") return Number(form.heightCm);
    const feet = Number(form.feet) || 0;
    const inches = Number(form.inches) || 0;
    return Math.round((feet * 12 + inches) * 2.54);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: Number(form.age),
          sex: form.sex,
          heightCm: resolvedHeightCm(),
          weightKg: Number(form.weightKg),
          measuredBmr: form.measuredBmr === "" ? undefined : Number(form.measuredBmr),
          activity: form.activity,
          goal: form.goal,
          diet: form.diet,
          equipment: form.equipment,
        }),
      });

      const data: ApiResponse = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult(data);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-accent";

  return (
    <div className="flex flex-col gap-10">
      {/* ---------------- FORM ---------------- */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-surface/60 p-6 sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Age" hint="years">
            <input
              type="number"
              inputMode="numeric"
              required
              min={13}
              max={100}
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              className={fieldClass}
              placeholder="28"
            />
          </Field>

          <Field label="Sex" hint="needed for the BMR formula">
            <select
              value={form.sex}
              onChange={(e) => set("sex", e.target.value)}
              className={fieldClass}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>

          <Field
            label="Height"
            hint={
              <button
                type="button"
                onClick={() => setHeightUnit(heightUnit === "cm" ? "ft" : "cm")}
                className="text-accent underline underline-offset-2"
              >
                switch to {heightUnit === "cm" ? "ft / in" : "cm"}
              </button>
            }
          >
            {heightUnit === "cm" ? (
              <input
                type="number"
                inputMode="numeric"
                required
                min={120}
                max={230}
                value={form.heightCm}
                onChange={(e) => set("heightCm", e.target.value)}
                className={fieldClass}
                placeholder="160"
              />
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  min={4}
                  max={7}
                  value={form.feet}
                  onChange={(e) => set("feet", e.target.value)}
                  className={fieldClass}
                  placeholder="5 ft"
                  aria-label="Height in feet"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={11}
                  value={form.inches}
                  onChange={(e) => set("inches", e.target.value)}
                  className={fieldClass}
                  placeholder="4 in"
                  aria-label="Height in inches"
                />
              </div>
            )}
          </Field>

          <Field label="Weight" hint="kg">
            <input
              type="number"
              inputMode="decimal"
              required
              min={30}
              max={300}
              step="0.1"
              value={form.weightKg}
              onChange={(e) => set("weightKg", e.target.value)}
              className={fieldClass}
              placeholder="65"
            />
          </Field>

          <Field label="Measured BMR" hint="optional">
            <input
              type="number"
              inputMode="numeric"
              min={600}
              max={4500}
              value={form.measuredBmr}
              onChange={(e) => set("measuredBmr", e.target.value)}
              className={fieldClass}
              placeholder="leave blank to calculate it"
            />
            <span className="text-xs text-muted">
              Only if you have a real one — from a smart scale, a DEXA scan or a metabolic test.
              Left blank we work it out from your height, weight, age and sex.
            </span>
          </Field>

          <Field label="Activity level" hint="be honest, not aspirational">
            <select
              value={form.activity}
              onChange={(e) => set("activity", e.target.value)}
              className={fieldClass}
            >
              {ACTIVITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.hint}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Equipment" hint="what you actually have">
            <select
              value={form.equipment}
              onChange={(e) => set("equipment", e.target.value)}
              className={fieldClass}
            >
              {EQUIPMENT.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-7">
          <p className="mb-2.5 text-sm font-medium">Goal</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((goal) => (
              <Chip
                key={goal.value}
                active={form.goal === goal.value}
                onClick={() => set("goal", goal.value)}
              >
                {goal.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2.5 text-sm font-medium">Diet</p>
          <div className="flex flex-wrap gap-2">
            {DIET_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                active={form.diet === option.value}
                onClick={() => set("diet", option.value)}
                title={option.hint}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          {loading ? "Building your plan…" : "Build my plan"}
        </button>
      </form>

      {/* ---------------- RESULTS ---------------- */}
      {result && (
        <PlanView
          plan={result.plan}
          nutrition={result.nutrition}
          todayIndex={todayIndex()}
          cached={result.cached}
          notice={result.notice}
        />
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 text-sm transition-all ${
        active
          ? "border-accent bg-accent text-accent-contrast"
          : "border-border text-muted hover:border-accent/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/** Monday-first index for today, because the plan weeks start on Monday. */
function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}
