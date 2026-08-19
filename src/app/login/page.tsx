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
/** Google's mark, in its own colours. Drawn here rather than pulled in. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /*
   * NEXT_PUBLIC_ variables are inlined at build time, so a client
   * component can check them directly. Better to say up front that
   * sign-in is not set up than to hand someone a button that fails
   * only once they have clicked it.
   */
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  /*
   * The redirect URL carries no query string on purpose.
   *
   * Supabase checks it against the project's allow list, and a URL
   * with "?next=..." on the end fails that check — at which point it
   * silently falls back to the site root and hands the session to a
   * page that is not looking for it. That is what made the link appear
   * to do nothing. Where to go afterwards is stashed here instead,
   * where nothing can quietly drop it.
   *
   * Both routes need this, so both call it.
   */
  function rememberDestination() {
    const next = new URLSearchParams(window.location.search).get("next") ?? "/today";
    sessionStorage.setItem("post-sign-in", next);
  }

  async function signInWithGoogle() {
    setError("");
    setGoogleLoading(true);

    try {
      rememberDestination();
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      // On success the browser is already navigating to Google, so there
      // is nothing to do here — only a failure ever comes back.
      if (error) {
        /*
         * Told apart on purpose. "Provider not enabled" means the project
         * has no Google credentials yet and no amount of retrying will
         * help, so saying "try again" would send someone in a circle.
         */
        const notSetUp = /provider .*(not enabled|is not enabled)/i.test(error.message);
        setError(
          notSetUp
            ? "Google sign-in isn't switched on for this site yet. Use email below for now."
            : "Could not reach Google just then. Try again, or use email below.",
        );
        setGoogleLoading(false);
      }
    } catch {
      setError("Google sign-in is not set up for this site yet.");
      setGoogleLoading(false);
    }
  }

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      rememberDestination();

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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

      {/* ---------------------------------------------------------------
          Google first, email second.

          Not a style choice. Without custom SMTP, Supabase only delivers
          sign-in mail to members of the project's own organisation — one
          address — and caps the whole project at two an hour. Email is
          therefore the route that works for exactly one person, and it
          stays only because that person is the one testing this.

          Google needs no mail server, so it is the one that works for
          everyone else.
          --------------------------------------------------------------- */}
      {!sent && configured && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium transition-colors hover:border-accent/50 disabled:opacity-50"
          >
            <GoogleMark className="h-4 w-4" />
            {googleLoading ? "Taking you to Google…" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">or use email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
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
            No password either way. The email route sends you a link that signs you in.
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
