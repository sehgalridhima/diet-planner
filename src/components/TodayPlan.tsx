"use client";

import { useState } from "react";
import type { NutritionPlan } from "@/lib/nutrition";
import type { MealPlan } from "@/lib/plan-types";
import PlanView, { planSections, type SectionId } from "@/components/PlanView";
import SectionNav from "@/components/SectionNav";
import Coach from "@/components/Coach";

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
      <SectionNav items={sections} section={section} onSelect={setSection} />

      <div className="min-w-0 flex-1">
        <PlanView
          plan={plan}
          nutrition={nutrition}
          todayIndex={todayIndex}
          cached={cached}
          section={section}
        />
      </div>

      {/* Docks to the window rather than sitting in this layout, so it
          lives at the page level rather than inside the plan. */}
      <Coach plan={plan} nutrition={nutrition} />
    </div>
  );
}
