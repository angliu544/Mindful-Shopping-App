import { Suspense } from "react";
import ItemUploadForm from "@/components/ItemUploadForm";
import LoadingState from "@/components/LoadingState";
import { requireUserId } from "@/lib/auth";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-[877px] px-4 pb-16 pt-8 sm:pt-[74px]">
      <h1 className="text-[34px] leading-tight text-heading sm:text-[58px]">Thinking about buying something?</h1>
      <p className="text-2xl text-heading sm:text-[32px]">
        Save it here and take a breather for a day. See if you would want it later
      </p>
      <div className="mt-8 sm:mt-[69px]">
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
