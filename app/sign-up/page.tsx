import AuthCard from "@/components/AuthCard";
import SignUpForm from "@/components/SignUpForm";

export default function SignUpPage() {
  return (
    <AuthCard title="Create your account" subtitle="Start pausing before you purchase.">
      <SignUpForm />
    </AuthCard>
  );
}
