import Link from "next/link";
import Planner from "@/components/Planner";
import { getUser } from "@/lib/profile";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;

  /*
   * Signing in is offered, never required. Someone opening this from a
   * portfolio link should get a full plan without an account — the
   * account only exists to save you retyping.
   */
  const user = await getUser();

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <header className="mb-10">
        <div className="mb-6 flex justify-end">
          {user ? (
            <Link
              href="/today"
              className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
            >
              Your plan
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </div>

        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          A diet plan built around{" "}
          <span className="text-accent">food you already eat</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Most plans fail because they ask you to eat quinoa and salmon on a
          Tuesday. This one works out your calorie and protein targets, then
          fills them with dal, roti, sabzi and curd — in portions you can
          picture.
        </p>
      </header>

      {deleted && (
        <p className="mb-8 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Your data has been deleted. Nothing of yours is stored any more.
        </p>
      )}

      <Planner />
    </main>
  );
}
