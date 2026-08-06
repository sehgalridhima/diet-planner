import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for server components, server actions and route
 * handlers.
 *
 * `cookies()` is async in this version of Next, so this is too.
 */
/**
 * Whether accounts are switched on at all.
 *
 * Callers check this first. Without it, a missing environment variable
 * takes down the anonymous planner too — which is the one part of the
 * app that never needed Supabase in the first place.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server components cannot set cookies. That is fine here:
            // proxy.ts refreshes the session on every request, so the
            // write this throws away has already happened there.
          }
        },
      },
    },
  );
}
