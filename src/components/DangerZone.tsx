"use client";

import { useState } from "react";
import { deleteAccountAction, signOutAction } from "@/app/actions";

/**
 * Sign out, and delete everything.
 *
 * The delete path is not optional politeness — this app stores age,
 * weight and a body goal, and anyone who hands that over is entitled
 * to take it back. It asks once before doing it, and says plainly
 * what goes.
 */
export default function DangerZone() {
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="mt-4 flex flex-col gap-4 border-t border-border pt-8">
      <form action={signOutAction}>
        <button
          type="submit"
          className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
        >
          Sign out
        </button>
      </form>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start text-sm text-warn underline underline-offset-4"
        >
          Delete my data
        </button>
      ) : (
        <div className="rounded-2xl border border-warn/40 bg-warn-soft p-5">
          <p className="text-sm leading-relaxed text-warn">
            This deletes your details and every weight you have logged. It cannot be undone, and
            there is nothing to restore from — we do not keep a copy.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={deleteAccountAction}>
              <button
                type="submit"
                className="rounded-xl border border-warn/50 px-4 py-2 text-sm font-medium text-warn"
              >
                Yes, delete it
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm"
            >
              Keep my data
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
