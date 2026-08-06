"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/*
 * Sign-in is a client component because the OAuth redirect has to be
 * started from the browser — Supabase needs to hand the provider a
 * URL it can come back to.
 */
export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * NEXT_PUBLIC_ variables are inlined at build time, so a client
   * component can check them directly. Better to say up front that
   * sign-in is not set up than to hand someone a button that fails
   * only once they have clicked it.
   */
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  async function signIn() {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const next = new URLSearchParams(window.location.search).get("next") ?? "/today";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) {
        setError("Could not start sign-in. Please try again.");
        setLoading(false);
      }
      // On success the browser leaves for Google, so nothing to do here.
    } catch {
      setError("Sign-in is not configured yet.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          So you don&rsquo;t have to type your details in every time. Your plan is worked out
          from them fresh on each visit — nothing about your week is stored.
        </p>
      </div>

      {!configured && (
        <div className="rounded-2xl border border-warn/40 bg-warn-soft p-5">
          <h2 className="text-sm font-semibold text-warn">Sign-in isn&rsquo;t set up yet</h2>
          <p className="mt-2 text-sm leading-relaxed text-warn">
            This app has no Supabase project connected, so there is nothing for Google to sign
            you in to. The planner on the home page works without an account.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={signIn}
        disabled={loading || !configured}
        className="flex items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium transition-colors hover:border-accent/40 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.47 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
          />
        </svg>
        {loading ? "Taking you to Google…" : "Continue with Google"}
      </button>

      {error && (
        <p className="rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
          {error}
        </p>
      )}

      <p className="text-xs leading-relaxed text-muted">
        We store your age, height, weight, activity level and goal so the plan can be rebuilt
        for you. You can edit or delete all of it at any time from your profile.
      </p>

      <Link href="/" className="text-xs text-muted underline underline-offset-4 hover:text-foreground">
        Carry on without an account
      </Link>
    </main>
  );
}
