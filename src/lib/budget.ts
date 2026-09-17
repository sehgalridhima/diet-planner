/* ===============================================================
   THE DAILY AI BUDGET
   ===============================================================
   One question, asked once per AI call: may this site spend another
   plan, or another Zenith answer, today?

   The two rate limits already in the app — five plans an hour, five
   questions an hour — are a Map in module scope, so each serverless
   instance keeps its own. They stop one person hammering the form,
   which is worth doing, and they were never able to be a ceiling for
   the site. This is that ceiling: Postgres, where the increment and
   the check happen in one atomic statement, with the limits living in
   the migration rather than here. The key below is public, and a
   limit you can pass as an argument is not a limit.

   WHAT THIS SENDS

   The word 'plan' or the word 'coach'. No profile, no weight, no
   goal, no user id, nothing from the tables in 0001 — those hold
   health data and are locked to their owner by RLS. This counter
   knows only that a call of some kind happened.

   No SDK. This is one POST; the Supabase client is already a
   dependency for auth, but reaching for it here would mean a browser
   client doing a server's job.
   =============================================================== */

const STORE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const STORE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Long enough for a cold Postgres connection, short enough that a
 *  hanging store does not hold someone's plan request open. */
const TIMEOUT_MS = 4_000;

export type AiKind = "plan" | "coach";

/*
 * Only used when the store cannot be reached. These mirror the numbers
 * in the migration by hand, which is the one duplicated fact in this
 * design and is worth the trouble: the alternative is that a Supabase
 * blip leaves the site completely unguarded.
 */
const FALLBACK_DAILY_LIMIT: Record<AiKind, number> = { plan: 8, coach: 40 };
const fallbackCount: Record<AiKind, { day: string; count: number }> = {
  plan: { day: "", count: 0 },
  coach: { day: "", count: 0 },
};

/** The day as Postgres reckons it, so the two counters roll over
 *  together. India, not UTC — a day that ends at 5:30am is nobody's
 *  idea of a day. */
function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Claim one AI call of this kind against today's budget.
 *
 * Returns false when that kind's budget is spent. Claiming is the same
 * act as asking, deliberately: a check that does not consume can be
 * raced, and two requests arriving together would both be told yes.
 */
export async function claimAi(kind: AiKind): Promise<boolean> {
  if (!STORE_URL || !STORE_KEY) {
    console.warn("[budget] no store configured — counting in memory only");
    return claimFromMemory(kind);
  }

  try {
    const response = await fetch(`${STORE_URL}/rest/v1/rpc/claim_ai`, {
      method: "POST",
      headers: { apikey: STORE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_kind: kind }),
      // This must never be cached. A cached "yes" is an unlimited yes.
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) throw new Error(`store returned ${response.status}`);
    return (await response.json()) === true;
  } catch (error) {
    /*
     * Falling back rather than refusing. Refusing would be the safer
     * arithmetic, but it hands anyone who can make Supabase slow an
     * off switch for the whole site — and the account's own spend
     * ceiling is still underneath all of this. So: keep serving, count
     * in memory, and say so loudly enough to find in the logs.
     */
    console.error("[budget] store unreachable, counting in memory:", error);
    return claimFromMemory(kind);
  }
}

function claimFromMemory(kind: AiKind): boolean {
  const day = today();
  const slot = fallbackCount[kind];
  if (slot.day !== day) {
    slot.day = day;
    slot.count = 0;
  }
  if (slot.count >= FALLBACK_DAILY_LIMIT[kind]) return false;
  slot.count += 1;
  return true;
}
