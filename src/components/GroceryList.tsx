"use client";

import { useMemo, useState } from "react";
import type { DayPlan } from "@/lib/plan-types";
import { buildGroceryList, formatLine, groupByCategory } from "@/lib/grocery";

/**
 * The week's shopping, totalled.
 *
 * Ticking things off is local state and deliberately not saved — a
 * shopping list you have to log in to use is worse than a piece of
 * paper, and this one is meant to survive the walk to the shop, not
 * the week.
 */
export default function GroceryList({ days }: { days: DayPlan[] }) {
  const groups = useMemo(() => groupByCategory(buildGroceryList(days)), [days]);
  const [got, setGot] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setGot((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const total = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">What to buy</h2>
        <p className="text-xs text-muted">
          {got.size} of {total} picked up
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.category} className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-medium">{group.category}</h3>
            <ul className="mt-3 flex flex-col gap-1.5">
              {group.items.map((item) => {
                const key = item.name;
                const done = got.has(key);
                return (
                  <li key={key}>
                    <label className="flex cursor-pointer items-baseline gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggle(key)}
                        className="accent-accent"
                      />
                      <span className={done ? "text-muted line-through" : ""}>{item.name}</span>
                      <span className="ml-auto font-mono text-xs text-muted">
                        {formatLine(item)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        This counts the portions in your week, not the recipes. &ldquo;Palak paneer&rdquo; is
        listed under paneer — the spinach, onion and spices that go with it are not, because the
        plan describes meals rather than recipes. Treat it as how much of the main things to buy,
        and shop for the everyday bits as usual.
      </p>
    </div>
  );
}
