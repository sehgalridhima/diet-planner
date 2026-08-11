"use client";

import { Icon } from "@/components/SectionNav";
import type { SectionId } from "@/components/PlanView";

/* ===============================================================
   PLAN CHOOSER
   ===============================================================
   What do you want? Asked once, as four tiles, before any form.

   Previously the menu sat there from the start and every item in it
   showed the same questionnaire, so clicking through felt like
   nothing was happening — the form was the answer to all seven
   entries. The menu now appears only once there is a plan to
   navigate, and the choice up front is short and visual.
   =============================================================== */

export type Choice = { id: SectionId; title: string; blurb: string; tag: string };

export const CHOICES: Choice[] = [
  {
    id: "form",
    title: "Everything",
    blurb: "Meals for the week, a shopping list, recipes and a training plan.",
    tag: "the lot",
  },
  {
    id: "diet",
    title: "Diet plan",
    blurb: "Seven days of food, what to buy for it, and how to cook it.",
    tag: "food only",
  },
  {
    id: "training",
    title: "Workout plan",
    blurb: "A training week built around the equipment you actually have.",
    tag: "free, no AI",
  },
  {
    id: "numbers",
    title: "Just my numbers",
    blurb: "BMR, TDEE, your calorie target and macros. Nothing else.",
    tag: "10 seconds",
  },
];

export default function PlanChooser({ onChoose }: { onChoose: (id: SectionId) => void }) {
  return (
    <div className="animate-rise">
      <h2 className="text-lg font-semibold tracking-tight">What do you want?</h2>
      <p className="mt-1 text-sm text-muted">
        Pick one and you will only be asked the questions it needs.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {CHOICES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onChoose(choice.id)}
            className="group flex flex-col rounded-2xl border border-border bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon id={choice.id} className="h-5 w-5" />
              </span>
              <span className="font-medium">{choice.title}</span>
              <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[0.68rem] leading-none text-muted">
                {choice.tag}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{choice.blurb}</p>
            <span className="mt-3 text-xs text-accent opacity-0 transition-opacity group-hover:opacity-100">
              Start &rarr;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
