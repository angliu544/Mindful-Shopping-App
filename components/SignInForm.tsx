"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OrDivider } from "@/components/AuthCard";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { signInWithPassword, type SignInState } from "@/lib/auth-actions";
import { safeCallbackUrl } from "@/lib/redirects";

/** Messages for ?error= codes from Auth.js and our signIn callback. Nothing internal is shown. */
function messageForError(code: string | null): string | null {
  switch (code) {
    case null:
      return null;
    case "UsePassword":
      return "This email already has an account that uses a password. Sign in with your email and password below.";
    case "GoogleEmailUnverified":
      return "Your Google account's email isn't verified, so we can't use it to sign in.";
    case "CredentialsSignin":
      return "Incorrect email or password.";
    case "Configuration":
      return "Sign-in isn't available right now. Please try again later.";
    default:
      return "We couldn't sign you in with Google. Please try again.";
  }
}

const inputClass = "mt-2 block w-full rounded-2xl border border-sage-200 bg-paper px-4 py-3 text-ink";

export default function SignInForm() {
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));
  const urlError = messageForError(params.get("error"));
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signInWithPassword, { error: null });
  const ids = { email: useId(), password: useId() };
  const error = state.error ?? (pending ? null : urlError);

  return (
    <div>
      {error && (
        <p role="alert" className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <GoogleSignInButton callbackUrl={callbackUrl} disabled={pending} />
      <OrDivider />

      <form action={formAction} className="space-y-5" aria-busy={pending}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div>
          <label htmlFor={ids.email} className="block font-medium">
            Email
          </label>
          <input
            id={ids.email}
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={ids.password} className="block font-medium">
            Password
          </label>
          <input
            id={ids.password}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700 disabled:opacity-70"
        >
          {pending && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-sage-700 underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </div>
  );
}
