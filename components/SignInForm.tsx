"use client";

import { useActionState, useId } from "react";
import { useSearchParams } from "next/navigation";
import { AuthSwitchLink } from "@/components/AuthCard";
import TextField, { FormError, primaryButton } from "@/components/TextField";
import { signInWithPassword, type SignInState } from "@/lib/auth-actions";
import { safeCallbackUrl } from "@/lib/redirects";

/** Messages for ?error= codes from Auth.js. Nothing internal is shown. */
function messageForError(code: string | null): string | null {
  switch (code) {
    case null:
      return null;
    case "CredentialsSignin":
      return "Incorrect email or password.";
    case "Configuration":
      return "Sign-in isn't available right now. Please try again later.";
    default:
      return "We couldn't sign you in. Please try again.";
  }
}

export default function SignInForm() {
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));
  const urlError = messageForError(params.get("error"));
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInWithPassword, { error: null });
  const ids = { email: useId(), password: useId() };
  const error = state.error ?? (pending ? null : urlError);

  return (
    <div>
      <form action={formAction} className="space-y-6" aria-busy={pending}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <TextField id={ids.email} label="Email:" name="email" type="email" autoComplete="email" required disabled={pending} />
        <TextField
          id={ids.password}
          label="Password:"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
        <FormError message={error} />
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <AuthSwitchLink prompt="New here?" href="/sign-up" label="Sign up" />
    </div>
  );
}
