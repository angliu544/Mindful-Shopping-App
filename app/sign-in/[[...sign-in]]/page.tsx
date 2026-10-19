import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import LoadingState from "@/components/LoadingState";

export default function SignInPage() {
  return (
    <div className="flex justify-center px-4 py-12">
      {/* Clerk reads the URL, which is request-time data. */}
      <Suspense fallback={<LoadingState />}>
        <SignIn />
      </Suspense>
    </div>
  );
}
