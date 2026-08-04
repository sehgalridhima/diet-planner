"use client";

import { useState } from "react";
import { ACTIVITY_OPTIONS, type NutritionPlan } from "@/lib/nutrition";
import { DIET_OPTIONS, type DietType, type MealPlan } from "@/lib/plan-types";

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

const EQUIPMENT = [
  "Bodyweight only",
  "Dumbbells at home",
  "Full gym",
  "Resistance bands",
];

export default function Planner() {
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [form, setForm] = useState({
    age: "",
    sex: "female",
    heightCm: "",
    feet: "",
    inches: "",
    weightKg: "",
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
      {result && <Results data={result} />}
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

function Results({ data }: { data: ApiResponse }) {
  const { plan, nutrition } = data;
  const totalCalories = plan.meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = plan.meals.reduce((sum, m) => sum + m.proteinG, 0);

  return (
    <section className="animate-rise flex flex-col gap-8">
      {/* Safety warnings come before anything else */}
      {nutrition.warnings.length > 0 && (
        <div className="rounded-2xl border border-warn/40 bg-warn-soft p-5">
          <h2 className="text-sm font-semibold text-warn">Worth reading first</h2>
          <ul className="mt-2.5 flex flex-col gap-2">
            {nutrition.warnings.map((warning, i) => (
              <li key={i} className="text-sm leading-relaxed text-warn">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.notice && (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          {data.notice}
        </p>
      )}

      {/* ---- Numbers ---- */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Your numbers</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Daily calories" value={`${nutrition.calories}`} unit="kcal" primary />
          <Stat label="Protein" value={`${nutrition.macros.proteinG}`} unit="g" />
          <Stat label="Carbs" value={`${nutrition.macros.carbsG}`} unit="g" />
          <Stat label="Fat" value={`${nutrition.macros.fatG}`} unit="g" />
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="BMR (at complete rest)" value={`${nutrition.bmr} kcal`} />
          <Row label="TDEE (with your activity)" value={`${nutrition.tdee} kcal`} />
          <Row label="BMI" value={`${nutrition.bmi} — ${nutrition.bmiCategory}`} />
          <Row
            label="Healthy weight for your height"
            value={`${nutrition.healthyWeightRange.min}–${nutrition.healthyWeightRange.max} kg`}
          />
          {nutrition.weeklyChangeKg !== 0 && (
            <Row
              label="Expected change"
              value={`${nutrition.weeklyChangeKg > 0 ? "+" : ""}${nutrition.weeklyChangeKg} kg per week`}
            />
          )}
        </dl>
      </div>

      {/* ---- Meals ---- */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Your day of eating</h2>
          <p className="text-xs text-muted">
            {totalCalories} kcal · {totalProtein}g protein
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {plan.meals.map((meal) => (
            <div key={meal.slot} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{meal.slot}</h3>
                <p className="font-mono text-xs text-muted">
                  {meal.calories} kcal · {meal.proteinG}g protein
                </p>
              </div>
              <ul className="mt-3 flex flex-col gap-1">
                {meal.items.map((item, i) => (
                  <li key={i} className="text-sm text-muted">
                    {item}
                  </li>
                ))}
              </ul>
              {meal.swap && (
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
                  <span className="font-medium text-foreground">Don&rsquo;t want this? </span>
                  {meal.swap}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ---- Workout ---- */}
      {plan.workout.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Your week of training</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {plan.workout.map((day) => (
              <div key={day.day} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-accent">{day.day}</span>
                  <h3 className="text-sm font-medium">{day.focus}</h3>
                </div>
                <ul className="mt-2 flex flex-col gap-1">
                  {day.exercises.map((exercise, i) => (
                    <li key={i} className="text-sm text-muted">
                      {exercise}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Notes ---- */}
      {plan.notes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Worth remembering</h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {plan.notes.map((note, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span className="text-accent">—</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="rounded-2xl border border-border bg-surface-2 p-5 text-xs leading-relaxed text-muted">
        <p>
          <strong className="text-foreground">This is not medical advice.</strong> Calories and
          macros are estimates from the Mifflin-St Jeor equation, which is a good starting point
          and not a measurement. If you are pregnant, managing a medical condition, or on
          medication, talk to a doctor before changing how you eat.
        </p>
        <p className="mt-2.5">
          Meals came from {plan.source === "ai" ? "Claude" : "the built-in planner"}
          {data.cached && ", served from cache"}. The numbers above are calculated in code, not
          generated, so they are the same every time.
        </p>
      </footer>
    </section>
  );
}

function Stat({
  label,
  value,
  unit,
  primary,
}: {
  label: string;
  value: string;
  unit: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        primary ? "border-accent/30 bg-accent-soft" : "border-border bg-surface"
      }`}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${primary ? "text-accent" : ""}`}>
        {value}
        <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
