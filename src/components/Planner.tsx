"use client";

import { useEffect, useState } from "react";
import { ACTIVITY_OPTIONS, type NutritionPlan } from "@/lib/nutrition";
import { CUISINE_OPTIONS, DIET_OPTIONS, type Cuisine, type DietType, type MealPlan } from "@/lib/plan-types";
import { EQUIPMENT_OPTIONS } from "@/lib/workout-planner";
import PlanView, { planSections, type SectionId } from "@/components/PlanView";
import SectionNav from "@/components/SectionNav";
import PlanChooser from "@/components/PlanChooser";
import Coach from "@/components/Coach";
import SavePlan from "@/components/SavePlan";

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

/* Narrated in the order the work actually happens. */
const STEPS = [
  "Working out your targets",
  "Choosing food that fits them",
  "Building your week",
  "Almost there",
];

export default function Planner({ signedIn = false }: { signedIn?: boolean }) {
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
    cuisine: "any" as Cuisine,
    equipment: "Bodyweight only",
    craving: "",
  });

  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * The sidebar is always on screen, including before a plan exists.
   * It was previously nested inside the results, which meant the one
   * thing it is for — telling you what this app contains — only
   * appeared once you had already worked that out.
   */
  const [section, setSection] = useState<SectionId>("form");

  /*
   * Null until they have said what they want. The menu does not exist
   * yet at that point — there is nothing to navigate, and showing one
   * whose every entry opens the same form was the thing that made the
   * app feel like it was ignoring the clicks.
   */
  const [chosen, setChosen] = useState<SectionId | null>(null);


  /*
   * A plan through Claude takes ten to twenty seconds. A button that
   * only changes its own label for that long reads as a hang, so the
   * wait gets narrated. The steps are honest about the order the work
   * actually happens in.
   */
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setStep((n) => Math.min(n + 1, STEPS.length - 1)), 4000);
    return () => clearInterval(id);
  }, [loading]);

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
    setStep(0);
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
          cuisine: form.cuisine,
          equipment: form.equipment,
          craving: form.craving,
          // Ask for exactly the section they picked. Anything else is
          // work nobody requested, and on the AI path a bill for it.
          want:
            section === "training"
              ? "training"
              : section === "numbers"
                ? "numbers"
                : section === "form"
                  ? "all"
                  : "food",
        }),
      });

      const data: ApiResponse = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult(data);
      // Land on whatever they asked for. Someone who picked "Workout
      // plan" before answering anything did so for a reason; dropping
      // them on the calorie breakdown ignores it.
      if (section === "form") setSection("numbers");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-accent";

  /*
   * The whole menu is on screen from the first second, so you can say
   * "I only want the workout plan" before answering anything. Picking a
   * section before there is a plan decides which questions you are
   * asked: nobody choosing a training plan should have to declare
   * whether they are vegan.
   */
  const sections = result
    ? [
        { id: "form" as const, label: "Your details", hint: "edit" },
        ...planSections(result.plan, result.nutrition),
      ]
    : [
        { id: "form" as const, label: "Your details", hint: "everything" },
        { id: "numbers" as const, label: "Your numbers", hint: "calories" },
        { id: "diet" as const, label: "Diet plan", hint: "7 days" },
        { id: "shopping" as const, label: "Shopping list", hint: "the week" },
        { id: "training" as const, label: "Workout plan", hint: "training" },
        { id: "notes" as const, label: "Worth remembering", hint: "notes" },
        { id: "recipes" as const, label: "Healthy recipes", hint: "methods" },
      ];

  /** What each section actually needs answered. */
  const NEEDS: Record<SectionId, { food: boolean; equipment: boolean }> = {
    form: { food: true, equipment: true },
    numbers: { food: false, equipment: false },
    diet: { food: true, equipment: false },
    recipes: { food: true, equipment: false },
    shopping: { food: true, equipment: false },
    training: { food: false, equipment: true },
    notes: { food: true, equipment: true },
  };

  const needs = NEEDS[section];
  const asking = sections.find((x) => x.id === section)?.label ?? "your plan";

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
      {result && <SectionNav items={sections} section={section} onSelect={setSection} />}

      {/* ---------------- PANEL ---------------- */}
      <div className="min-w-0 flex-1">
      {!result && !chosen && (
        <PlanChooser
          onChoose={(id) => {
            setChosen(id);
            setSection(id);
          }}
        />
      )}

      {((result && section === "form") || (!result && chosen)) && (
      <>
      {!result && (
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setChosen(null)}
            className="text-xs text-muted underline underline-offset-4 hover:text-foreground"
          >
            &larr; Change what you want
          </button>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">{asking}</h2>
          <p className="mt-1 text-sm text-muted">
            Only the questions this needs, nothing else.
          </p>
        </div>
      )}
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

          {needs.food && (
          <Field label="Craving anything?" hint="optional">
            <input
              type="text"
              maxLength={120}
              value={form.craving}
              onChange={(e) => set("craving", e.target.value)}
              className={fieldClass}
              placeholder="pasta, chole bhature, chocolate…"
            />
            <span className="text-xs text-muted">
              Tell us and it gets built into the week at a portion that fits. A plan you enjoy
              is the one you actually follow.
            </span>
          </Field>
          )}

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

          {needs.equipment && (
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
          )}
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

        {needs.food && (
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

          <p className="mb-2.5 mt-5 text-sm font-medium">
            Cuisine{" "}
            <span className="font-normal text-muted">— what you actually like cooking</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                active={form.cuisine === option.value}
                onClick={() => set("cuisine", option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>
        )}

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

        {loading && (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <ul className="flex flex-col gap-2.5">
              {STEPS.map((label, i) => {
                const done = i < step;
                const now = i === step;
                return (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        done
                          ? "border-accent bg-accent"
                          : now
                            ? "animate-pulse border-accent"
                            : "border-border"
                      }`}
                    >
                      {done && (
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-accent-contrast">
                          <path
                            d="M2 6.5l2.5 2.5L10 3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className={done || now ? "text-foreground" : "text-muted"}>{label}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
              The calorie maths is instant. Waiting on the food choices.
            </p>
          </div>
        )}
      </form>

      </>
      )}

      {result && section !== "form" && (
        <PlanView
          plan={result.plan}
          nutrition={result.nutrition}
          todayIndex={todayIndex()}
          cached={result.cached}
          notice={result.notice}
          section={section}
        />
      )}
      </div>

      {/* ---------------------------------------------------------------
          Zenith, at the page level rather than inside the plan.

          It used to live inside PlanView, which meant it only existed
          once a plan did — so on the home page there was nothing, and
          "the chatbot isn't there" was simply correct. Here it is
          always mounted; without a plan it answers generally and says
          so, rather than inventing numbers for someone it knows
          nothing about.

          It docks to the window, so being the last child of this row
          costs the layout nothing.
          --------------------------------------------------------------- */}
      {/* Only once there is a plan worth keeping, and only for someone
          who has nowhere to keep it yet. */}
      {result && !signedIn && section !== "form" && (
        <SavePlan
          profile={{
            age: form.age,
            sex: form.sex,
            heightCm: String(resolvedHeightCm()),
            weightKg: form.weightKg,
            measuredBmr: form.measuredBmr,
            activity: form.activity,
            goal: form.goal,
            diet: form.diet,
            cuisine: form.cuisine,
            equipment: form.equipment,
            craving: form.craving,
          }}
        />
      )}

      <Coach plan={result?.plan} nutrition={result?.nutrition} />
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
