"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { safeCallbackUrl } from "@/lib/redirects";
import { signInSchema } from "@/lib/validations";

export type SignInState = { error: string | null };

/** Same message for unknown email and wrong password, so neither is revealed. */
const INVALID_CREDENTIALS = "Incorrect email or password.";

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeCallbackUrl(formData.get("callbackUrl")) });
}

export async function signInWithPassword(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: INVALID_CREDENTIALS };

  try {
    // On success this throws Next's redirect, which must propagate.
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: error.type === "CredentialsSignin" ? INVALID_CREDENTIALS : "We couldn't sign you in. Please try again.",
      };
    }
    throw error;
  }
  return { error: null };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
