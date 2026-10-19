import { Suspense } from "react";
import ItemUploadForm from "@/components/ItemUploadForm";
import LoadingState from "@/components/LoadingState";
import { requireUserId } from "@/lib/auth";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <h1 className="font-serif text-3xl font-semibold">Thinking about buying something?</h1>
      <p className="mt-3 text-ink-muted">
        Save it here and step away. In 24 hours you&apos;ll decide whether you still want it.
      </p>
      <div className="mt-8">
        <Suspense fallback={<LoadingState />}>
          <UploadContent />
        </Suspense>
      </div>
    </div>
  );
}

async function UploadContent() {
  await requireUserId();
  return <ItemUploadForm />;
}
