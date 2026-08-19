import Link from "next/link";
import { getProfile, getWeightLog, requireUser } from "@/lib/profile";
import ProfileForm from "@/components/ProfileForm";
import DangerZone from "@/components/DangerZone";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireUser();
  const { welcome } = await searchParams;

  const profile = await getProfile();

  /*
   * Google hands us a name at sign-in. Offering it as the default
   * beats an empty box someone has to fill with something we were
   * already told — and it stays a default, editable before it is
   * saved and after.
   */
  const suggestedName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "";
  const weights = await getWeightLog(10);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {welcome ? "A few details" : "Your details"}
        </h1>
        {profile && (
          <Link
            href="/today"
            className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
          >
            Back to today
          </Link>
        )}
      </header>

      {welcome && (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-muted">
          Signed in as {user.email}. Fill these in once and your plan will be waiting each time
          you visit.
        </p>
      )}

      <ProfileForm profile={profile} suggestedName={suggestedName} />

      {weights.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold tracking-tight">Recent weights</h2>
          <ul className="mt-4 flex flex-col">
            {weights.map((w) => (
              <li
                key={w.loggedAt}
                className="flex justify-between border-b border-border py-2 text-sm"
              >
                <span className="text-muted">
                  {new Date(w.loggedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="font-medium">{w.weightKg} kg</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DangerZone />
    </main>
  );
}
