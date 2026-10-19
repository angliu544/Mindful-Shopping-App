import { Suspense } from "react";
import {connection} from "next/server";
import HistoryView from "@/components/HistoryView";
import LoadingState from "@/components/LoadingState";
import { requireUserId } from "@/lib/auth";
import { getHistory } from "@/lib/items";
import { getIncomeSettings } from "@/lib/settings";

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <h1 className="font-serif text-3xl font-semibold">Your decisions</h1>
      <p className="mt-2 text-ink-muted">Every item you let go is money you kept.</p>
      <div className="mt-8">
        <Suspense fallback={<LoadingState label="Loading your history…" />}>
          <HistoryContent />
        </Suspense>
      </div>
    </div>
  );
}

async function HistoryContent() {
  await connection();
  const userId = await requireUserId();
  // Errors propagate to app/history/error.tsx, which offers a retry.
  const [history, income] = await Promise.all([getHistory(userId), getIncomeSettings(userId)]);
  return <HistoryView history={history} income={income} />;
}
