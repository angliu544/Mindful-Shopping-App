import { Suspense } from "react";
import AuthCard from "@/components/AuthCard";
import LoadingState from "@/components/LoadingState";
import SignInForm from "@/components/SignInForm";

export default function SignInPage() {
  return (
    <AuthCard
      title="Sign In"
      subtitle={
        <>
          <p className="text-[38px] leading-tight sm:text-[48px]">Welcome back!</p>
          <p className="text-2xl sm:text-[32px]">Please sign in to see what you are considering.</p>
        </>
      }
    >
      {/* The form reads ?error= and ?callbackUrl=, which are request-time data. */}
      <Suspense fallback={<LoadingState />}>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
