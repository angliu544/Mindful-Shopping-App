import { Suspense } from "react";
import LoadingState from "@/components/LoadingState";
import PhasePlaceholder from "@/components/PhasePlaceholder";

export default function HistoryPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PhasePlaceholder title="History" body="Your decisions and savings arrive in a later phase." />
    </Suspense>
  );
}
