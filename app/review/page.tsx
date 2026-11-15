import { Suspense } from "react";
import { connection } from "next/server";
import LoadingState from "@/components/LoadingState";
import ReviewDeck from "@/components/ReviewDeck";
import { requireUserId } from "@/lib/auth";
import { getReviewQueue } from "@/lib/items";
import { getIncomeSettings } from "@/lib/settings";

export default function ReviewPage() {
  return (
    <div className="px-4 pb-12 pt-4 sm:pt-[13px]">
      <Suspense fallback={<LoadingState label="Loading your items…" />}>
        <ReviewContent />
      </Suspense>
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
