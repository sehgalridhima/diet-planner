"use client";

import { useEffect, useRef, useState } from "react";
import type { NutritionPlan } from "@/lib/nutrition";
import type { MealPlan } from "@/lib/plan-types";

/* ===============================================================
   ZENITH — the coach that can see your plan
   ===============================================================
   A plan is a wall of decisions someone else made. This is where
   you get to ask why — and it can answer properly, because it is
   handed the same week you are looking at rather than being a
   general chatbot bolted to the side of a diet app.

   Every question costs real money, and there are five of them. So
   the count is visible from the start rather than sprung on someone
   at the end, and the starter questions are there to stop the first
   one being spent on "hi".

   It docks to the right edge rather than sitting in the page. The
   column is 768px wide and the sidebar takes 224 of it, so a third
   column would have left the meal plan and the chat about 250px
   each — not enough to read either. Fixed to the edge, it lands in
   the empty margin on a laptop and covers the page only on a phone,
   and the plan keeps the width it was designed at.
   =============================================================== */

type Turn = { role: "user" | "assistant"; text: string };

/**
 * The questions worth spending one on.
 *
 * With a plan, deliberately the ones a generic bot could not answer —
 * each needs this person's week. Without one, questions Zenith can
 * actually answer well, rather than four prompts that would all come
 * back with "make a plan first".
 */
const STARTERS_WITH_PLAN = [
  "Why is my calorie target this number?",
  "Can I swap today's lunch for something else?",
  "I don't like paneer — what else gets me the protein?",
  "Is this workout too much to start with?",
];

const STARTERS_NO_PLAN = [
  "What is BMR, and why does it matter?",
  "How does this planner decide my calories?",
  "How much protein does a vegetarian diet actually need?",
  "Do I need a gym to get anywhere?",
];

export default function Coach({
  plan,
  nutrition,
  open,
  onOpenChange,
}: {
  /** Absent on the home page, where no plan has been built yet */
  plan?: MealPlan;
  nutrition?: NutritionPlan;
  /*
   * Controlled by the page, so the card among the chooser tiles can
   * open this panel. Two things on the same screen labelled "Ask
   * Zenith" have to do the same thing.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const hasPlan = Boolean(plan && nutrition);
  const STARTERS = hasPlan ? STARTERS_WITH_PLAN : STARTERS_NO_PLAN;
  const setOpen = onOpenChange;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);

  const threadEnd = useRef<HTMLDivElement>(null);

  // The count comes from the server, so a reload cannot hand someone
  // five more questions than they have.
  useEffect(() => {
    if (!open || remaining !== null) return;
    let cancelled = false;
    fetch("/api/coach")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && typeof data.remaining === "number") setRemaining(data.remaining);
      })
      .catch(() => {
        /* Leave it unknown rather than guessing — the server decides. */
      });
    return () => {
      cancelled = true;
    };
  }, [open, remaining]);

  useEffect(() => {
    if (turns.length > 0) threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  // Escape closes it. The panel covers the page on a phone, so without
  // this the only way out is finding a small × in the corner.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  /*
   * Shifting the page happens in CSS, from a class on <html>, rather
   * than by styling the container here — the panel is rendered deep
   * inside the plan and has no business reaching up to the layout.
   * The breakpoint lives in the stylesheet too, so there is no
   * viewport width duplicated in JavaScript to fall out of step.
   */
  useEffect(() => {
    document.documentElement.classList.toggle("zenith-open", open);
    return () => document.documentElement.classList.remove("zenith-open");
  }, [open]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || asking) return;

    setError("");
    setAsking(true);
    setQuestion("");

    // Shown immediately: waiting for a round trip before your own
    // words appear makes the box feel broken.
    const asked: Turn = { role: "user", text: trimmed };
    const history = turns;
    setTurns([...history, asked]);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, plan, nutrition, history }),
      });
      const data = await response.json();

      if (typeof data.remaining === "number") setRemaining(data.remaining);

      if (!response.ok || !data.answer) {
        setError(data.error ?? "Couldn't get an answer just then.");
        // Put the question back so it is not lost with the failure.
        setTurns(history);
        setQuestion(trimmed);
        return;
      }

      setTurns([...history, asked, { role: "assistant", text: data.answer }]);
    } catch {
      setError("Couldn't reach the coach. Check your connection and try again.");
      setTurns(history);
      setQuestion(trimmed);
    } finally {
      setAsking(false);
    }
  }

  const spent = remaining !== null && remaining <= 0;

  return (
    <>
      {/* ---------------------------------------------------------------
          The handle, bottom right.

          Kept out of the page flow so the plan keeps its reading width:
          the column is 768px wide and the sidebar takes 224 of it, so a
          third column would have left the meal plan and the chat about
          250px each, which is not enough to read either.
          --------------------------------------------------------------- */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={hasPlan ? "Ask Zenith about your plan" : "Ask Zenith"}
        className={`fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-3 shadow-lg transition-all hover:border-accent/50 hover:shadow-xl ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <ChatIcon className="h-5 w-5 text-accent" />
        <span className="text-sm font-medium">Ask Zenith</span>
      </button>

      {/* Only on a phone, where the panel covers the page. On a laptop it
          sits in the margin beside the plan, so dimming would be wrong —
          the plan is exactly what you are asking about. */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={`fixed inset-0 z-30 bg-black/25 transition-opacity sm:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* The panel stays mounted so a conversation survives closing it.
          `inert` is what keeps that honest: parked off-screen it would
          otherwise still be in the tab order, and someone tabbing
          through the plan would land in an input they cannot see. */}
      <aside
        aria-label="Zenith"
        inert={!open}
        className={`fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-surface transition-transform duration-200 sm:w-[380px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-5 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <ChatIcon className="h-4 w-4" />
          </span>
          <h2 className="font-medium">Zenith</h2>
          {remaining !== null && (
            <span className="whitespace-nowrap rounded-full bg-surface-2 px-2 py-0.5 text-[0.68rem] leading-none text-muted">
              {remaining} left this hour
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="ml-auto shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* The thread is the only part that scrolls. Header and composer
            stay put, so the box you type in never walks off the screen
            during a long answer. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {turns.length === 0 ? (
            <>
              <p className="text-sm leading-relaxed text-muted">
                {hasPlan
                  ? "Zenith can see your week, your numbers and your training, so ask it something only your plan could answer."
                  : "No plan yet, so Zenith can only answer in general — it knows nothing about you and won't pretend otherwise. Build one and it can talk about your actual week."}
              </p>
              <div className="mt-4 flex flex-col items-start gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    disabled={asking || spent}
                    onClick={() => ask(starter)}
                    className="rounded-2xl border border-border px-3 py-2 text-left text-xs leading-relaxed text-foreground/80 transition-colors hover:border-accent/50 hover:text-foreground disabled:opacity-50"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              {turns.map((turn, i) => (
                <div
                  key={i}
                  className={
                    turn.role === "user"
                      ? "self-end max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-accent-contrast"
                      : "max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-2.5 text-sm leading-relaxed"
                  }
                >
                  {turn.text}
                </div>
              ))}
              {asking && (
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-2.5 text-sm text-muted">
                  Thinking&hellip;
                </div>
              )}
              <div ref={threadEnd} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-5 py-4">
          {error && (
            <p className="mb-3 rounded-xl border border-warn/40 bg-warn-soft px-3.5 py-2.5 text-xs leading-relaxed text-warn">
              {error}
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
            className="flex gap-2"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={asking || spent}
              maxLength={400}
              placeholder={
                spent ? "Back in an hour" : hasPlan ? "Ask about this plan" : "Ask about food or training"
              }
              className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm transition-colors focus:border-accent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={asking || spent || !question.trim()}
              className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Ask
            </button>
          </form>

          <p className="mt-3 text-xs leading-relaxed text-muted">
            {hasPlan ? "Answers from your plan, and won’t work out new numbers. " : "Won’t guess numbers for you — the planner works those out. "}
            Not a doctor &mdash; a medical condition, medication or pregnancy needs a real one.
          </p>
        </div>
      </aside>
    </>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}
