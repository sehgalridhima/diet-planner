"use client";

import { useState } from "react";
import type { NutritionPlan } from "@/lib/nutrition";
import type { MealPlan } from "@/lib/plan-types";
import GroceryList from "@/components/GroceryList";
import Recipes from "@/components/Recipes";

/* ===============================================================
   PLAN VIEW
   ===============================================================
   Shared by the anonymous form and the signed-in /today page, so
   the two can never drift into showing the same week differently.

   A week of meals, a shopping list, a training plan and a recipe
   book is far too much to stack on one page, so it is sectioned
   behind a sidebar. Two things stay outside that: the safety
   warnings and the medical disclaimer. Anything that exists to be
   read before you act on the plan cannot sit behind a tab the
   reader might never open.

   `todayIndex` is passed in rather than computed here. The signed-in
   page works it out from the timezone on the profile; the anonymous
   form reads the browser's clock. Computing it inside would mean the
   server rendering one day and the browser another.
   =============================================================== */

export type SectionId =
  | "form"
  | "numbers"
  | "diet"
  | "recipes"
  | "shopping"
  | "training"
  | "notes";

/** The sections a finished plan fills in, in sidebar order. */
export function planSections(plan: MealPlan, nutrition: NutritionPlan) {
  /*
   * Only what this plan actually holds. A training-only request comes
   * back with no days in it, and listing an empty "Diet plan" would be
   * offering something that is not there.
   */
  const hasFood = plan.days.length > 0;
  const hasTraining = plan.workout.length > 0;

  return [
    { id: "numbers" as const, label: "Your numbers", hint: `${nutrition.calories} kcal` },
    ...(hasFood
      ? [
          { id: "diet" as const, label: "Diet plan", hint: `${plan.days.length} days` },
          { id: "recipes" as const, label: "Healthy recipes", hint: "methods" },
          { id: "shopping" as const, label: "Shopping list", hint: "the week" },
        ]
      : []),
    ...(hasTraining
      ? [
          {
            id: "training" as const,
            label: "Workout plan",
            hint: `${plan.workout.filter((w) => !w.rest).length} sessions`,
          },
        ]
      : []),
    ...(plan.notes.length > 0
      ? [{ id: "notes" as const, label: "Worth remembering", hint: `${plan.notes.length}` }]
      : []),
  ];
}

export default function PlanView({
  plan,
  nutrition,
  todayIndex,
  cached = false,
  notice,
  showNumbers = true,
  section,
}: {
  plan: MealPlan;
  nutrition: NutritionPlan;
  todayIndex: number;
  cached?: boolean;
  notice?: string;
  showNumbers?: boolean;
  /** Which section the page shell has selected */
  section: SectionId;
}) {
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const day = plan.days[selectedDay] ?? plan.days[0];


  return (
    <section className="animate-rise flex flex-col gap-8">
      {/* Safety warnings come before anything else, and outside the tabs */}
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

      {notice && (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          {notice}
        </p>
      )}

      <div>
          {section === "numbers" && showNumbers && (
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Your numbers</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Daily calories" value={`${nutrition.calories}`} unit="kcal" primary />
                <Stat label="Protein" value={`${nutrition.macros.proteinG}`} unit="g" />
                <Stat label="Carbs" value={`${nutrition.macros.carbsG}`} unit="g" />
                <Stat label="Fat" value={`${nutrition.macros.fatG}`} unit="g" />
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Row
                  label={
                    nutrition.bmrSource === "measured"
                      ? "BMR (yours, as measured)"
                      : "BMR (at complete rest)"
                  }
                  value={
                    nutrition.bmrSource === "measured"
                      ? `${nutrition.bmr} kcal · formula said ${nutrition.estimatedBmr}`
                      : `${nutrition.bmr} kcal`
                  }
                />
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
          )}

          {section === "diet" && (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {selectedDay === todayIndex ? "Today's eating" : `${day.day}'s eating`}
                </h2>
                <p className="text-xs text-muted">
                  {day.calories} kcal · {day.proteinG}g protein
                </p>
              </div>

              {/* Seven days at once is a wall, so open on today */}
              <div className="mt-4 flex flex-wrap gap-2">
                {plan.days.map((d, i) => (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => setSelectedDay(i)}
                    aria-pressed={i === selectedDay}
                    className={`rounded-full border px-3.5 py-1.5 text-xs transition-all ${
                      i === selectedDay
                        ? "border-accent bg-accent text-accent-contrast"
                        : "border-border text-muted hover:border-accent/40 hover:text-foreground"
                    }`}
                  >
                    {d.day}
                    {i === todayIndex && <span className="ml-1 opacity-70">·</span>}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {day.meals.map((meal) => (
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
                        <span className="font-medium text-foreground">
                          Don&rsquo;t want this?{" "}
                        </span>
                        {meal.swap}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "recipes" && (
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Healthy recipes</h2>
              <p className="mt-1 text-sm text-muted">
                For the dishes in your week, at the portions and the oil the plan assumes.
              </p>
              <div className="mt-4">
                <Recipes days={plan.days} />
              </div>
            </div>
          )}

          {section === "shopping" && <GroceryList days={plan.days} />}

          {section === "training" && plan.workout.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Your week of training</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {plan.workout.map((w, i) => (
                  <div
                    key={w.day}
                    className={`rounded-2xl border p-4 ${
                      i === todayIndex
                        ? "border-accent/40 bg-accent-soft"
                        : w.rest
                          ? "border-border bg-surface-2"
                          : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-accent">{w.day}</span>
                      <h3 className={`text-sm font-medium ${w.rest ? "text-muted" : ""}`}>
                        {w.focus}
                      </h3>
                      {i === todayIndex && (
                        <span className="ml-auto text-xs text-accent">today</span>
                      )}
                    </div>
                    {w.blocks.map((block) => (
                      <div key={block.name} className="mt-3">
                        {!w.rest && (
                          <p className="text-xs font-medium uppercase tracking-wide text-muted/70">
                            {block.name}
                          </p>
                        )}
                        <ul className="mt-1 flex flex-col gap-1">
                          {block.items.map((item, j) => (
                            <li key={j} className="text-sm text-muted">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "notes" && plan.notes.length > 0 && (
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
      </div>

      {/* Outside the tabs on purpose: nobody should be able to miss this */}
      <footer className="rounded-2xl border border-border bg-surface-2 p-5 text-xs leading-relaxed text-muted">
        <p>
          <strong className="text-foreground">This is not medical advice.</strong> Calories and
          macros are estimates from the Mifflin-St Jeor equation, which is a good starting point
          and not a measurement. If you are pregnant, managing a medical condition, or on
          medication, talk to a doctor before changing how you eat.
        </p>
        <p className="mt-2.5">
          Meals came from {plan.source === "ai" ? "Claude" : "the built-in planner"}
          {cached && ", served from cache"}. The numbers above, and the training plan, are built
          in code rather than generated, so they are the same every time.
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
