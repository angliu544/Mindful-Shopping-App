import AuthCard from "@/components/AuthCard";
import SignUpForm from "@/components/SignUpForm";

export default function SignUpPage() {
  return (
    <AuthCard title="Sign up" subtitle={<p className="text-[38px] leading-tight sm:text-[48px]">Create your account!</p>}>
      <SignUpForm />
    </AuthCard>
  );
}
