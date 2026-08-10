"use client";

import { useState } from "react";
import type { NutritionPlan } from "@/lib/nutrition";
import type { MealPlan } from "@/lib/plan-types";
import PlanView, { planSections, type SectionId } from "@/components/PlanView";

/**
 * The signed-in plan, with the same sidebar the anonymous page has.
 *
 * PlanView renders one section; the switcher lives out here so that
 * the anonymous page can put its form in the same list. This is the
 * signed-in half of that arrangement.
 */
export default function TodayPlan({
  plan,
  nutrition,
  todayIndex,
  cached,
}: {
  plan: MealPlan;
  nutrition: NutritionPlan;
  todayIndex: number;
  cached: boolean;
}) {
  const [section, setSection] = useState<SectionId>("diet");
  const sections = planSections(plan, nutrition);

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
      <nav
        aria-label="Sections"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:w-52 sm:shrink-0 sm:flex-col sm:overflow-visible sm:px-0 sm:pb-0"
      >
        <div className="sm:sticky sm:top-6 sm:flex sm:flex-col sm:gap-1">
          {sections.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-baseline justify-between gap-3 whitespace-nowrap rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors sm:w-full ${
                  active
                    ? "border-accent/40 bg-accent-soft text-accent"
                    : "border-transparent text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                <span className={active ? "font-medium" : ""}>{s.label}</span>
                <span className="hidden font-mono text-[0.65rem] opacity-60 sm:inline">
                  {s.hint}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <PlanView
          plan={plan}
          nutrition={nutrition}
          todayIndex={todayIndex}
          cached={cached}
          section={section}
        />
      </div>
    </div>
  );
}
