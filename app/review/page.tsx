import { Suspense } from "react";
import LoadingState from "@/components/LoadingState";
import PhasePlaceholder from "@/components/PhasePlaceholder";

export default function ReviewPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PhasePlaceholder title="Review" body="Swipe cards arrive in a later phase." />
    </Suspense>
  );
}
