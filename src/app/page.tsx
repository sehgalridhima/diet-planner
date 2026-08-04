import Planner from "@/components/Planner";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <header className="mb-10">
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

      <Planner />
    </main>
  );
}
