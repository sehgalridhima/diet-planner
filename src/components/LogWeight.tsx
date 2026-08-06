"use client";

import { useActionState } from "react";
import { logWeightAction } from "@/app/actions";

/**
 * Today's weigh-in.
 *
 * Kept to one field on the page people actually open, because a
 * weight log only works if logging takes three seconds. Saving it
 * updates the profile through a database trigger, so the calorie
 * target follows the weight down without anyone editing anything.
 */
export default function LogWeight({ currentWeightKg }: { currentWeightKg: number }) {
  const [state, formAction, pending] = useActionState(logWeightAction, null);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-5"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Weighed yourself today?</span>
        <input
          type="number"
          name="weightKg"
          step="0.1"
          min={30}
          max={300}
          defaultValue={currentWeightKg}
          className="w-32 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-border px-4 py-2.5 text-sm transition-colors hover:border-accent/40 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log it"}
      </button>

      {state && "error" in state && state.error && (
        <p className="w-full text-sm text-warn">{state.error}</p>
      )}
      {state && "ok" in state && state.ok && (
        <p className="w-full text-sm text-muted">
          Saved. Your targets have been recalculated from it.
        </p>
      )}
    </form>
  );
}
