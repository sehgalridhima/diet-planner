"use client";

import { useRouter } from "next/navigation";
import { stashProfile, type PendingProfile } from "@/lib/pending-plan";

/* ===============================================================
   SAVE THIS PLAN
   ===============================================================
   The only route by which an anonymous visitor's details reach the
   database, and it goes through them: press this, sign in, and the
   profile form arrives already filled with what you typed — for you
   to check and save, or not.

   Nothing is stored by pressing this button. It puts the answers in
   your own browser and sends you to sign in. The row is written on
   the other side, by you, on a form showing exactly what it holds.
   That ordering is the feature: a health app that had quietly saved
   your weight before you agreed to it has told you something about
   itself.

   It also states the trade rather than hiding it — an account exists
   to stop you retyping this, and that is all it does.
   =============================================================== */

export default function SavePlan({ profile }: { profile: PendingProfile }) {
  const router = useRouter();

  return (
    <section className="rounded-2xl border border-dashed border-border bg-surface/50 p-5">
      <h2 className="font-medium">Want this back tomorrow?</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Save it to an account and your plan is waiting on the next visit &mdash; no form to fill
        in again. Nothing is stored until you have signed in and pressed Save on a page showing
        you exactly what it keeps.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            stashProfile(profile);
            router.push("/login?next=/today");
          }}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90"
        >
          Save this plan
        </button>
        <span className="text-xs text-muted">
          Email link, no password. Delete everything whenever you like.
        </span>
      </div>
    </section>
  );
}
