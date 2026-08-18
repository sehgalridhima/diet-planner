"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveProfileAction } from "@/app/actions";
import { ACTIVITY_OPTIONS } from "@/lib/nutrition";
import { CUISINE_OPTIONS, DIET_OPTIONS } from "@/lib/plan-types";
import { EQUIPMENT_OPTIONS } from "@/lib/workout-planner";
import type { Profile } from "@/lib/profile";
import { clearStashedProfile, readStashedProfile } from "@/lib/pending-plan";

const GOALS = [
  { value: "lose", label: "Lose fat" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Build muscle" },
];

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction, pending] = useActionState(saveProfileAction, null);

  /*
   * The browser's timezone, sent along with the form. The server runs
   * in UTC, so without this "today" would roll over at 5:30am in India
   * and show Tuesday's dinner on Monday evening.
   *
   * Written straight to the DOM rather than held in state: reading it
   * during render would make the server and the browser disagree, and
   * setting state in an effect just to fill a hidden field is a render
   * pass for nothing.
   */
  const zoneRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && zoneRef.current) zoneRef.current.value = detected;
  }, []);

  /*
   * Fill the form from what they typed before signing in.
   *
   * Written into the DOM rather than held in state, for the same
   * reason the timezone is: the stash lives in localStorage, which the
   * server cannot see, so reading it during render would have the two
   * disagree about what the page says.
   *
   * Filled, not saved. They arrive at a form they can read and change,
   * and the row is written when they press Save — which is the whole
   * distinction the button on the other side promised.
   *
   * Only when there is no profile yet. Someone editing details they
   * already have should never find a week-old answer typed over them.
   */
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (profile) return;

    const stashed = readStashedProfile();
    if (!stashed || !formRef.current) return;

    for (const [name, value] of Object.entries(stashed)) {
      if (value === "") continue;
      const field = formRef.current.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
        field.value = value;
      }
    }

    // One use. Leaving it would refill the form the next time they came
    // to edit something.
    clearStashedProfile();
  }, [profile]);

  const field =
    "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-accent";

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <input
        type="hidden"
        name="timezone"
        ref={zoneRef}
        defaultValue={profile?.timezone ?? "Asia/Kolkata"}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Age" hint="years">
          <input
            type="number"
            name="age"
            required
            min={13}
            max={100}
            defaultValue={profile?.age ?? ""}
            className={field}
          />
        </Field>

        <Field label="Sex" hint="needed for the BMR formula">
          <select name="sex" defaultValue={profile?.sex ?? "female"} className={field}>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </Field>

        <Field label="Height" hint="cm">
          <input
            type="number"
            name="heightCm"
            required
            min={120}
            max={230}
            defaultValue={profile?.heightCm ?? ""}
            className={field}
          />
        </Field>

        <Field label="Weight" hint="kg">
          <input
            type="number"
            name="weightKg"
            step="0.1"
            required
            min={30}
            max={300}
            defaultValue={profile?.weightKg ?? ""}
            className={field}
          />
        </Field>

        <Field label="Craving anything?" hint="optional">
          <input
            type="text"
            name="craving"
            maxLength={120}
            defaultValue={profile?.craving ?? ""}
            placeholder="pasta, chole bhature, chocolate…"
            className={field}
          />
        </Field>

        <Field label="Measured BMR" hint="optional">
          <input
            type="number"
            name="measuredBmr"
            min={600}
            max={4500}
            defaultValue={profile?.measuredBmr ?? ""}
            placeholder="leave blank to calculate it"
            className={field}
          />
        </Field>

        <Field label="Activity">
          <select
            name="activity"
            defaultValue={profile?.activity ?? "sedentary"}
            className={field}
          >
            {ACTIVITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} — {o.hint}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Goal">
          <select name="goal" defaultValue={profile?.goal ?? "lose"} className={field}>
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Diet">
          <select name="diet" defaultValue={profile?.diet ?? "veg"} className={field}>
            {DIET_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label} — {d.hint}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Cuisine" hint="what you like cooking">
          <select name="cuisine" defaultValue={profile?.cuisine ?? "any"} className={field}>
            {CUISINE_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Equipment">
          <select
            name="equipment"
            defaultValue={profile?.equipment ?? "Bodyweight only"}
            className={field}
          >
            {EQUIPMENT_OPTIONS.map((e) => (
              <option key={e.value} value={e.label}>
                {e.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {state?.error && (
        <p className="rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Saving…" : profile ? "Save changes" : "Build my plan"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
