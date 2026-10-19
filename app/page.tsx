import Link from "next/link";

const steps = [
  { title: "Capture it", body: "Snap a photo of the thing you want, with its name and price." },
  { title: "Wait a day", body: "It's set aside for 24 hours. No peeking, no pressure." },
  { title: "Decide calmly", body: "Swipe right to buy, left to let it go, and watch your savings grow." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <section className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-sage-600">
          Pause before you purchase
        </p>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Mindful Shopping
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-ink-muted">
          Most impulse buys feel different a day later. Save the item, give it 24 hours, then
          decide with a clear head.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/upload"
            className="w-full rounded-full bg-sage-600 px-6 py-3 text-center font-medium text-white shadow-sm hover:bg-sage-700 sm:w-auto"
          >
            Start a pause
          </Link>
          <Link
            href="/sign-up"
            className="w-full rounded-full border border-sage-200 bg-paper px-6 py-3 text-center font-medium text-ink hover:bg-sage-50 sm:w-auto"
          >
            Sign up
          </Link>
          <Link
            href="/sign-in"
            className="w-full rounded-full border border-sage-200 px-6 py-3 text-center font-medium text-ink hover:bg-sage-50 sm:w-auto"
          >
            Sign in
          </Link>
        </div>
      </section>

      <ol className="mt-20 grid gap-4 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="rounded-3xl border border-sage-100 bg-paper p-6">
            <span className="font-serif text-2xl text-sage-500">{i + 1}</span>
            <h2 className="mt-2 font-semibold text-ink">{step.title}</h2>
            <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
