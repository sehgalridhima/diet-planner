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
            {/* Always visible: hover states do not exist on a phone, so
                anything that only appears on hover is invisible to half
                the people using this. The arrow nudges on hover instead. */}
            <span className="mt-3 flex items-center gap-1 text-xs font-medium text-accent">
              Start
              <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
            </span>
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------------------
          Zenith, before there is anything for it to read.

          It cannot answer yet — its whole job is reading the plan you
          are about to make — so this says what it is rather than
          offering a box that would take a question and have nothing to
          answer it from. Naming it here is the point: left until after
          the plan, nobody scrolled far enough to find out it existed.
          --------------------------------------------------------------- */}
      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-dashed border-border bg-surface/50 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-3.8-.7L3 21l1.9-4.8A8.3 8.3 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" />
          </svg>
        </span>
        <div className="min-w-0">
          {/* Flex-wrap rather than an inline span: on a narrow screen an
              inline badge breaks mid-phrase, so the pill split across
              two lines with "free, 5" stranded on the first. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <p className="font-medium">Zenith comes with it</p>
            <span className="whitespace-nowrap rounded-full bg-surface-2 px-2 py-0.5 text-[0.68rem] leading-none text-muted">
              free, 5 questions an hour
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            A coach that can see the plan it made you, so you can ask it things no general chatbot
            could answer &mdash; swap Tuesday&rsquo;s lunch, why your target is the number it is,
            what to eat instead of paneer. It appears under your plan once there is one to read.
          </p>
        </div>
      </div>
    </div>
  );
}
