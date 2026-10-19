import { Suspense } from "react";
import { connection } from "next/server";
import LoadingState from "@/components/LoadingState";
import ReviewDeck from "@/components/ReviewDeck";
import { requireUserId } from "@/lib/auth";
import { getReviewQueue } from "@/lib/items";
import { getIncomeSettings } from "@/lib/settings";

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:py-12">
      <h1 className="font-serif text-3xl font-semibold">Do you still want it?</h1>
      <p className="mt-2 text-ink-muted">A day has passed. Take a breath and decide.</p>
      <div className="mt-6">
        <Suspense fallback={<LoadingState label="Loading your items…" />}>
          <ReviewContent />
        </Suspense>
      </div>
    </div>
  );
}

async function ReviewContent() {
  // The queue depends on the current time, so it must be computed per request.
  await connection();
  const userId = await requireUserId();
  // Errors propagate to app/review/error.tsx, which offers a retry.
  const [queue, income] = await Promise.all([getReviewQueue(userId), getIncomeSettings(userId)]);
  return <ReviewDeck initial={queue} income={income} />;
}
