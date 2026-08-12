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

   Two things drive the design:

   Every question costs real money, and there are five of them. So
   the count is visible from the start rather than sprung on someone
   at the end, and the starter questions are there to stop the first
   one being spent on "hi".

   It is collapsed until asked for. Open by default, it would sit
   under every section competing with the plan for attention, and
   most people reading a shopping list do not have a question.
   =============================================================== */

type Turn = { role: "user" | "assistant"; text: string };

/**
 * The questions worth spending one on. Deliberately the ones a
 * generic bot could not answer — each needs this person's plan.
 */
const STARTERS = [
  "Why is my calorie target this number?",
  "Can I swap today's lunch for something else?",
  "I don't like paneer — what else gets me the protein?",
  "Is this workout too much to start with?",
];

export default function Coach({
  plan,
  nutrition,
}: {
  plan: MealPlan;
  nutrition: NutritionPlan;
}) {
  const [open, setOpen] = useState(false);
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-sm"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <ChatIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">Ask Zenith</span>
          <span className="mt-0.5 block text-sm leading-relaxed text-muted">
            Swap a meal, or ask where a number came from. Five questions an hour.
          </span>
        </span>
        <span className="ml-auto shrink-0 text-accent transition-transform group-hover:translate-x-0.5">
          &rarr;
        </span>
      </button>
    );
  }

  return (
    <section className="animate-rise rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-baseline gap-3">
        <h2 className="font-medium">Zenith</h2>
        {remaining !== null && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.68rem] leading-none text-muted">
            {remaining} left this hour
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto text-xs text-muted underline underline-offset-4 hover:text-foreground"
        >
          Hide
        </button>
      </div>

      {turns.length === 0 && (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Zenith can see your week, your numbers and your training, so ask it something only
            your plan could answer.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={asking || spent}
                onClick={() => ask(starter)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:border-accent/50 hover:text-foreground disabled:opacity-50"
              >
                {starter}
              </button>
            ))}
          </div>
        </>
      )}

      {turns.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {turns.map((turn, i) => (
            <div
              key={i}
              className={
                turn.role === "user"
                  ? "self-end max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-accent-contrast"
                  : "max-w-[90%] rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
              }
            >
              {turn.text}
            </div>
          ))}
          {asking && (
            <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-2.5 text-sm text-muted">
              Thinking&hellip;
            </div>
          )}
          <div ref={threadEnd} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={asking || spent}
          maxLength={400}
          placeholder={spent ? "Back in an hour" : "Ask anything about this plan"}
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

      {error && (
        <p className="mt-3 rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
          {error}
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Zenith answers from your plan and won&rsquo;t work out new numbers. It isn&rsquo;t a
        doctor &mdash; anything to do with a medical condition, medication or pregnancy needs a
        real one.
      </p>
    </section>
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
