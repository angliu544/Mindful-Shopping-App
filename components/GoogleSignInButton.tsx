"use client";

import { useFormStatus } from "react-dom";
import { signInWithGoogle } from "@/lib/auth-actions";

function SubmitButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="sk sk-field mx-auto flex min-h-[72px] w-full max-w-[542px] items-center justify-center rounded-[19px] px-4 text-[30px] text-heading [--sk-w:7px] hover:brightness-[0.98] disabled:opacity-60 sm:min-h-[93px] sm:text-[44px]"
    >
      {pending ? "Redirecting to Google…" : label}
    </button>
  );
}

/** Starts Auth.js Google sign-in via a server action. */
export default function GoogleSignInButton({
  callbackUrl,
  label = "Continue with Google",
  disabled = false,
}: {
  callbackUrl: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <SubmitButton label={label} disabled={disabled} />
    </form>
  );
}
