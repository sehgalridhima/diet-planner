import Link from "next/link";
import { redirect } from "next/navigation";
import TodayPlan from "@/components/TodayPlan";
import { buildPlan } from "@/lib/build-plan";
import { getProfile, getWeightLog, requireUser, toUserInput } from "@/lib/profile";
import { parseEquipment } from "@/lib/workout-planner";
import { DAYS } from "@/lib/plan-types";
import LogWeight from "@/components/LogWeight";

/* ===============================================================
   TODAY
   ===============================================================
   The signed-in home page. Reads the saved profile, rebuilds the
   week from it, and opens on today.

   Nothing about the plan is stored — it is deterministic from the
   profile, so recomputing costs nothing and can never go stale
   against a weight that has since changed.
   =============================================================== */

/** Monday-first index for today in the user's own timezone. */
function todayIndexIn(timezone: string): number {
  let weekday: string;
  try {
    weekday = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      weekday: "short",
    }).format(new Date());
  } catch {
    // A bad zone must not take the page down.
    weekday = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    }).format(new Date());
  }

  const index = (DAYS as readonly string[]).indexOf(weekday);
  return index === -1 ? 0 : index;
}

export default async function TodayPage() {
  await requireUser();

  const profile = await getProfile();
  if (!profile) redirect("/profile?welcome=1");

  const { plan, nutrition, cached } = await buildPlan(
    toUserInput(profile),
    profile.diet,
    parseEquipment(profile.equipment),
    { craving: profile.craving, cuisine: profile.cuisine },
  );

  const weights = await getWeightLog(30);
  const latest = weights[0];
  const earliest = weights[weights.length - 1];
  const change =
    weights.length > 1 ? Number((latest.weightKg - earliest.weightKg).toFixed(1)) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="mt-1 text-sm text-muted">
            {profile.weightKg} kg
            {change !== null && (
              <>
                {" · "}
                <span className={change < 0 ? "text-accent" : ""}>
                  {change > 0 ? "+" : ""}
                  {change} kg over {weights.length} readings
                </span>
              </>
            )}
          </p>
        </div>
        <Link
          href="/profile"
          className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
        >
          Your details
        </Link>
      </header>

      <LogWeight currentWeightKg={profile.weightKg} />

      <TodayPlan
        plan={plan}
        nutrition={nutrition}
        todayIndex={todayIndexIn(profile.timezone)}
        cached={cached}
      />
    </main>
  );
}
