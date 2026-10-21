import { Suspense } from "react";
import AuthCard from "@/components/AuthCard";
import LoadingState from "@/components/LoadingState";
import SignInForm from "@/components/SignInForm";

export default function SignInPage() {
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to see what you're considering.">
      {/* The form reads ?error= and ?callbackUrl=, which are request-time data. */}
      <Suspense fallback={<LoadingState />}>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
