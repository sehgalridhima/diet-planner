"use client";

import { useMemo, useState } from "react";
import type { DayPlan } from "@/lib/plan-types";
import { recipesForWeek } from "@/lib/recipes";

/**
 * How to actually cook the week.
 *
 * One recipe open at a time — a page of twenty expanded recipes is a
 * page nobody reads.
 */
export default function Recipes({ days }: { days: DayPlan[] }) {
  const { matched, unmatchedCount } = useMemo(() => recipesForWeek(days), [days]);
  const [open, setOpen] = useState<string | null>(matched[0]?.recipe.name ?? null);

  if (matched.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        No recipes matched this week&rsquo;s dishes yet. The recipe book covers the staples —
        dal, chilla, poha, khichdi, paneer, rajma, chole and the rest — so a week built mostly
        from those will fill this section.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        {matched.length} recipes covering your week
        {unmatchedCount > 0 && `, ${unmatchedCount} dishes without one yet`}
      </p>

      {matched.map(({ recipe, dishes }) => {
        const isOpen = open === recipe.name;
        return (
          <div key={recipe.name} className="rounded-2xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : recipe.name)}
              aria-expanded={isOpen}
              className="flex w-full items-baseline justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="font-medium">{recipe.name}</span>
              <span className="font-mono text-xs text-muted">
                {recipe.minutes} min {isOpen ? "−" : "+"}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-border px-5 py-4">
                <p className="text-xs text-muted">
                  In your week as: {dishes.slice(0, 2).join(" · ")}
                  {dishes.length > 2 && ` · +${dishes.length - 2} more`}
                </p>

                <div className="mt-4 grid gap-6 sm:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-medium uppercase tracking-wide text-muted/70">
                      You need
                    </h4>
                    <ul className="mt-2 flex flex-col gap-1">
                      {recipe.ingredients.map((item, i) => (
                        <li key={i} className="text-sm text-muted">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium uppercase tracking-wide text-muted/70">
                      Method
                    </h4>
                    <ol className="mt-2 flex flex-col gap-1.5">
                      {recipe.steps.map((step, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-muted">
                          <span className="font-mono text-xs text-accent">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {recipe.tip && (
                  <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                    <span className="font-medium text-foreground">The bit people get wrong: </span>
                    {recipe.tip}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
