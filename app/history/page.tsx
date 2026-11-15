import { Suspense } from "react";
import { connection } from "next/server";
import HistoryView from "@/components/HistoryView";
import LoadingState from "@/components/LoadingState";
import { requireUserId } from "@/lib/auth";
import { getHistory } from "@/lib/items";
import { getIncomeSettings } from "@/lib/settings";

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-[860px] px-4 pb-16 pt-6 sm:pt-[45px]">
      <Suspense fallback={<LoadingState label="Loading your history…" />}>
        <HistoryContent />
      </Suspense>
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
