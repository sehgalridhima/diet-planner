import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Google sends the user back to.
 *
 * Exchanges the one-time code for a session cookie, then forwards
 * them on. A user with no profile yet goes to /profile to fill it in
 * once; everyone else goes where they were headed.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/today";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] code exchange failed:", error.message);
    return NextResponse.redirect(new URL("/login?error=exchange_failed", url.origin));
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
  // let someone hand out a link that logs you in and bounces you off
  // to a page they control.
  const target = next.startsWith("/") ? next : "/today";
  return NextResponse.redirect(new URL(target, url.origin));
}
