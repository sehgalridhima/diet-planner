"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/*
 * Sign-in is a magic link: type an email, get a link, click it.
 *
 * No password to store, forget or leak, and no OAuth provider to
 * register — Google sign-in would need a Google Cloud project, a
 * consent screen and redirect URIs kept in step across two dashboards,
 * which is a lot of setup to save someone one click.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
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

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const next = new URLSearchParams(window.location.search).get("next") ?? "/today";

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) {
        setError(
          error.message.toLowerCase().includes("rate")
            ? "Too many links requested. Wait a minute and try again."
            : "Could not send the link. Check the address and try again.",
        );
      } else {
        setSent(true);
      }
    } catch {
      setError("Sign-in is not configured yet.");
    } finally {
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
            This app has no Supabase project connected, so there is nowhere to sign in to. The
            planner on the home page works without an account.
          </p>
        </div>
      )}

      {sent ? (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5">
          <h2 className="text-sm font-semibold text-accent">Check your email</h2>
          <p className="mt-2 text-sm leading-relaxed text-accent">
            A sign-in link is on its way to <strong>{email}</strong>. It works once and expires
            in an hour. If it hasn&rsquo;t arrived in a minute, look in spam.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setError("");
            }}
            className="mt-4 text-xs text-accent underline underline-offset-4"
          >
            Use a different address
          </button>
        </div>
      ) : (
        <form onSubmit={sendLink} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!configured}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-accent disabled:opacity-50"
            />
          </label>

          <button
            type="submit"
            disabled={loading || !configured}
            className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Email me a sign-in link"}
          </button>

          <p className="text-xs leading-relaxed text-muted">
            No password. We email you a link that signs you in.
          </p>
        </form>
      )}

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
