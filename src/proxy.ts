import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* ===============================================================
   PROXY — session refresh and an optimistic auth check
   ===============================================================
   This is `proxy.ts`, not `middleware.ts`. The middleware convention
   is deprecated in this version of Next and was renamed.

   Two jobs:
     1. Refresh the Supabase session cookie on every request, so a
        signed-in user is not quietly logged out mid-week.
     2. Bounce anonymous visitors away from the signed-in pages.

   Job 2 is optimistic only — it reads the session and nothing else.
   The real check happens in requireProfile(), next to the data.
   Proxy runs on prefetches too, so a database call here would be
   paid on routes nobody ever visits.
   =============================================================== */

const SIGNED_IN_ONLY = ["/today", "/profile"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /*
   * No Supabase configured yet. The anonymous planner is the whole
   * app in that state and must keep working, so fall through rather
   * than crashing every route on a missing environment variable.
   */
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser, not getSession: this revalidates the token with Supabase
  // rather than trusting a cookie the browser could have edited.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && SIGNED_IN_ONLY.some((p) => path.startsWith(p))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    // Come back to where they were headed once they are signed in.
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (user && path === "/login") {
    const today = request.nextUrl.clone();
    today.pathname = "/today";
    today.search = "";
    return NextResponse.redirect(today);
  }

  return response;
}

export const config = {
  // Skip static assets and image optimisation, or auth logic would
  // block CSS and JS from loading.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
