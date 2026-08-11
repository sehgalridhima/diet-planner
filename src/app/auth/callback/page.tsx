"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/* ===============================================================
   SIGN-IN CALLBACK
   ===============================================================
   This runs in the browser rather than on the server, and that is
   the whole point.

   Supabase's default email template links to its own /auth/v1/verify,
   which verifies the token and then bounces back here with the
   session in the URL *fragment* — "#access_token=...". A fragment is
   never sent to the server, so a route handler sees an empty query
   string, concludes the link is broken, and returns you to the login
   page. Which is exactly what it did.

   The template can be changed to send ?token_hash instead, but that
   setting lives in a dashboard the app cannot reach, so relying on it
   would mean the app only works if someone remembered to configure
   it. Handling all three shapes here works whatever the project is
   set to:

     #access_token & #refresh_token   implicit — set the session
     ?code                            PKCE — exchange it
     ?token_hash & type               OTP — verify it
   =============================================================== */

type State = "working" | "failed";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("working");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function signIn() {
      const supabase = createClient();
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const next = query.get("next") ?? "/today";
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const type = query.get("type") as EmailOtpType | null;

      // Supabase reports its own failures in the fragment too.
      const linkError = hash.get("error_description") ?? query.get("error_description");

      let failure: string | null = null;

      if (linkError) {
        failure = linkError;
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        failure = error?.message ?? null;
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        failure = error?.message ?? null;
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        failure = error?.message ?? null;
      } else {
        failure = "That link has nothing in it to sign you in with.";
      }

      if (cancelled) return;

      if (failure) {
        setDetail(failure);
        setState("failed");
        return;
      }

      // Somewhere to land: the profile form the first time, the plan
      // after that.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let target = next.startsWith("/") ? next : "/today";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (!profile) target = "/profile?welcome=1";
      }

      // Clear the token out of the address bar on the way through.
      window.history.replaceState({}, "", "/auth/callback");
      router.replace(target);
    }

    signIn();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 py-16">
      {state === "working" ? (
        <>
          <h1 className="text-xl font-semibold tracking-tight">Signing you in…</h1>
          <p className="text-sm text-muted">One moment.</p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold tracking-tight">That link didn&rsquo;t work</h1>
          <p className="text-sm leading-relaxed text-muted">
            Sign-in links work once and expire after an hour, so an older one or a second click
            will land here. Ask for a fresh one and it should go straight through.
          </p>
          {detail && (
            <p className="rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">
              {detail}
            </p>
          )}
          <Link
            href="/login"
            className="self-start rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-contrast"
          >
            Send me a new link
          </Link>
        </>
      )}
    </main>
  );
}
