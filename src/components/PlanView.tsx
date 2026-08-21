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
    // Recipes last: you decide what to eat and what to buy first, and
    // only then look up how to cook it.
    ...(hasFood
      ? [{ id: "recipes" as const, label: "Healthy recipes", hint: "methods" }]
      : []),
  ];
}

/* ---------------------------------------------------------------
   A colour and a glyph per meal slot.

   Four identical white cards meant the only way to tell breakfast
   from dinner was to read the heading. These make the day scannable
   — and they run warm through the day on purpose, so the order of
   the four is visible even out of context.
   --------------------------------------------------------------- */
const SLOT_STYLE: Record<string, { bar: string; chip: string }> = {
  Breakfast: { bar: "bg-accent", chip: "bg-accent-soft text-accent" },
  Lunch: { bar: "bg-carbs", chip: "bg-warn-soft text-warn" },
  Snack: { bar: "bg-fat", chip: "bg-fat/12 text-fat" },
  Dinner: { bar: "bg-accent-2", chip: "bg-accent-2-soft text-accent-2" },
};

function MealIcon({ slot, className }: { slot: string; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (slot) {
    case "Breakfast": // sunrise
      return (
        <svg {...common}>
          <path d="M12 3v3M5.5 8.5 7.6 10.6M18.5 8.5 16.4 10.6M3 18h18M6 18a6 6 0 0 1 12 0" />
        </svg>
      );
    case "Lunch": // full plate
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
    case "Snack": // cup
      return (
        <svg {...common}>
          <path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
          <path d="M16 9.5h2a2.5 2.5 0 0 1 0 5h-2" />
          <path d="M7 3.5v2M11 3.5v2" />
        </svg>
      );
    default: // moon
      return (
        <svg {...common}>
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
        </svg>
      );
  }
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
            <div className="print-block">
              {/*
                The calorie target is the one number the whole plan
                rests on, so it is the only one set at display size.
                Four equal tiles made it compete with its own macros.
              */}
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[3.25rem] font-semibold leading-none tracking-tight text-accent">
                    {nutrition.calories}
                  </p>
                  <p className="mt-1.5 text-base text-muted">calories a day</p>
                </div>

                {nutrition.weeklyChangeKg !== 0 && (
                  <p className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted">
                    {nutrition.weeklyChangeKg > 0 ? "+" : ""}
                    {nutrition.weeklyChangeKg} kg per week
                  </p>
                )}
              </div>

              <MacroBar macros={nutrition.macros} calories={nutrition.calories} />

              <dl className="mt-7 grid gap-x-8 gap-y-3 text-[0.9375rem] sm:grid-cols-2">
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
              </dl>
            </div>
          )}

          {section === "diet" && (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight">
                  {selectedDay === todayIndex ? "Today's eating" : `${day.day}'s eating`}
                </h2>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-foreground"
                >
                  Print the week
                </button>
              </div>

              {/*
                Against target, not just a total. "1550 kcal" tells you
                nothing on its own; a bar against 1580 tells you at a
                glance whether the day lands.
              */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Meter
                  label="Calories"
                  value={day.calories}
                  target={nutrition.calories}
                  unit="kcal"
                  colour="bg-accent"
                />
                <Meter
                  label="Protein"
                  value={day.proteinG}
                  target={nutrition.macros.proteinG}
                  unit="g"
                  colour="bg-protein"
                />
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
                  <div
                    key={meal.slot}
                    className="print-block overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--lift)]"
                  >
                    {/* A stripe in the slot's own colour, so four meals
                        read as four things at a glance rather than as
                        four paragraphs that have to be read to be told
                        apart. */}
                    <div className={`h-1 ${SLOT_STYLE[meal.slot].bar}`} />
                    <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2.5 font-medium">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${SLOT_STYLE[meal.slot].chip}`}
                        >
                          <MealIcon slot={meal.slot} className="h-[1.05rem] w-[1.05rem]" />
                        </span>
                        {meal.slot}
                      </h3>
                      <p className="text-xs text-muted">
                        <span className="font-medium text-foreground">{meal.calories}</span> kcal
                        {" · "}
                        <span className="font-medium text-protein">{meal.proteinG}g</span> protein
                      </p>
                    </div>
                    <ul className="mt-3 flex flex-col gap-1">
                      {meal.items.map((item, i) => (
                        <li key={i} className="text-[0.9375rem] leading-relaxed text-muted">
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


/**
 * Protein, carbs and fat as one bar rather than three numbers.
 *
 * The split is what people are actually trying to read, and a ratio
 * is far easier to see than to work out from three figures in
 * different units.
 */
/**
 * A value against the target it is supposed to hit.
 *
 * Over-target is drawn differently rather than by clipping the bar:
 * a bar pinned at 100% cannot tell you whether you are ten calories
 * over or three hundred.
 */
function Meter({
  label,
  value,
  target,
  unit,
  colour,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  colour: string;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  const over = value > target;
  const gap = value - target;

  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-sm">
          <span className="font-medium">{value}</span>
          <span className="text-muted">
            {" "}/ {target} {unit}
          </span>
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full ${over ? "bg-warn" : colour}`} style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-1.5 text-xs text-muted">
        {Math.abs(gap) <= Math.max(2, target * 0.02)
          ? "on target"
          : over
            ? `${gap} ${unit} over`
            : `${Math.abs(gap)} ${unit} short`}
      </p>
    </div>
  );
}

function MacroBar({
  macros,
  calories,
}: {
  macros: { proteinG: number; carbsG: number; fatG: number };
  calories: number;
}) {
  const parts = [
    { key: "Protein", grams: macros.proteinG, kcal: macros.proteinG * 4, colour: "bg-protein" },
    { key: "Carbs", grams: macros.carbsG, kcal: macros.carbsG * 4, colour: "bg-carbs" },
    { key: "Fat", grams: macros.fatG, kcal: macros.fatG * 9, colour: "bg-fat" },
  ];
  const total = parts.reduce((sum, p) => sum + p.kcal, 0) || calories;

  return (
    <div className="mt-7">
      <div className="flex h-3 overflow-hidden rounded-full">
        {parts.map((p) => (
          <div
            key={p.key}
            className={p.colour}
            style={{ width: `${(p.kcal / total) * 100}%` }}
            title={`${p.key}: ${p.grams}g`}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {parts.map((p) => (
          <div key={p.key} className="flex items-baseline gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.colour}`} aria-hidden />
            <span className="text-sm text-muted">{p.key}</span>
            <span className="text-sm font-medium">{p.grams}g</span>
            <span className="text-xs text-muted">{Math.round((p.kcal / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5">
      <dt className="text-muted">{label}</dt>
      {/* The value must not break across lines — "1450" above "kcal"
          reads as two numbers. The label wraps instead. */}
      <dd className="shrink-0 whitespace-nowrap font-medium">{value}</dd>
    </div>
  );
}
