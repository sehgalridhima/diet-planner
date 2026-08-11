import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Where the magic link lands.
 *
 * Supabase sends one of two shapes depending on the email template in
 * the project, and which one you get is not something the app can
 * decide:
 *
 *   ?code=...                     the PKCE flow, exchanged for a session
 *   ?token_hash=...&type=magiclink   the default template, verified as an OTP
 *
 * Handling only one of them produces a sign-in link that lands on an
 * error page for reasons no user could ever guess, so this handles
 * both.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/today";

  const supabase = await createClient();
  let failed: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) failed = error.message;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) failed = error.message;
  } else {
    failed = "no code or token in the link";
  }

  if (failed) {
    console.error("[auth] sign-in link failed:", failed);
    return NextResponse.redirect(new URL("/login?error=link", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.redirect(new URL("/profile?welcome=1", url.origin));
    }
  }

  // Only ever redirect within this site — an open redirect here would
  // let someone hand out a link that signs you in and bounces you off
  // to a page they control.
  const target = next.startsWith("/") ? next : "/today";
  return NextResponse.redirect(new URL(target, url.origin));
}
