import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import LoadingState from "@/components/LoadingState";

export default function SignUpPage() {
  return (
    <div className="flex justify-center px-4 py-12">
      {/* Clerk reads the URL, which is request-time data. */}
      <Suspense fallback={<LoadingState />}>
        <SignUp />
      </Suspense>
    </div>
  );
}
