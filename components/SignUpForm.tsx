"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { OrDivider } from "@/components/AuthCard";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { signInWithPassword } from "@/lib/auth-actions";
import { DEFAULT_AFTER_SIGN_IN } from "@/lib/redirects";
import { fieldErrorsOf, registerSchema } from "@/lib/validations";
import type { ApiErrorBody } from "@/types/api";

type Field = "name" | "email" | "password" | "confirmPassword";
type Status = "idle" | "creating" | "signing-in";

const fields: { name: Field; label: string; type: string; autoComplete: string; hint?: string }[] = [
  { name: "name", label: "Name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
];

export default function SignUpForm() {
  const baseId = useId();
  const lockRef = useRef(false);
  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const busy = status !== "idle";

  function update(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lockRef.current) return;

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      setFormError("Please fix the highlighted fields.");
      return;
    }

    lockRef.current = true;
    setStatus("creating");
    setFormError(null);
    try {
      let res: Response;
      try {
        res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
      } catch {
        throw { error: "We couldn't reach the server. Check your connection and try again." } satisfies ApiErrorBody;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
        throw { error: data?.error ?? "We couldn't create your account. Please try again.", fieldErrors: data?.fieldErrors } satisfies ApiErrorBody;
      }

      // Account created: sign straight in. On success this navigates away.
      setStatus("signing-in");
      const form = new FormData();
      form.set("email", parsed.data.email);
      form.set("password", values.password);
      form.set("callbackUrl", DEFAULT_AFTER_SIGN_IN);
      const result = await signInWithPassword({ error: null }, form);
      if (result.error) {
        setFormError("Your account was created, but we couldn't sign you in. Please sign in below.");
        setStatus("idle");
      }
    } catch (error) {
      const err = error as ApiErrorBody;
      setFormError(err.error ?? "Something went wrong. Please try again.");
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      setStatus("idle");
    } finally {
      lockRef.current = false;
    }
  }

  return (
    <div>
      <GoogleSignInButton callbackUrl={DEFAULT_AFTER_SIGN_IN} disabled={busy} />
      <OrDivider />

      <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={busy}>
        {fields.map((f) => {
          const id = `${baseId}-${f.name}`;
          const error = fieldErrors[f.name];
          return (
            <div key={f.name}>
              <label htmlFor={id} className="block font-medium">
                {f.label}
              </label>
              <input
                id={id}
                name={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                value={values[f.name]}
                onChange={(e) => update(f.name, e.target.value)}
                disabled={busy}
                aria-invalid={!!error}
                aria-describedby={[f.hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}
                className={`mt-2 block w-full rounded-2xl border bg-paper px-4 py-3 text-ink ${error ? "border-red-400" : "border-sage-200"}`}
              />
              {f.hint && (
                <p id={`${id}-hint`} className="mt-1 text-sm text-ink-muted">
                  {f.hint}
                </p>
              )}
              {error && (
                <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>
          );
        })}

        {formError && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700 disabled:opacity-70"
        >
          {busy && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {status === "creating" ? "Creating account…" : status === "signing-in" ? "Signing you in…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-sage-700 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
