import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for client components.
 *
 * Only ever uses the anon key, which is safe to ship to the browser —
 * row level security is what actually protects the data, not the
 * secrecy of this key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
