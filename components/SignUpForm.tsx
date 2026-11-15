"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { AuthSwitchLink } from "@/components/AuthCard";
import TextField, { FormError, primaryButton } from "@/components/TextField";
import { signInWithPassword } from "@/lib/auth-actions";
import { DEFAULT_AFTER_SIGN_IN } from "@/lib/redirects";
import { fieldErrorsOf, registerSchema } from "@/lib/validations";
import type { ApiErrorBody } from "@/types/api";

type Field = "name" | "email" | "password" | "confirmPassword";
type Status = "idle" | "creating" | "signing-in";

const fields: { name: Field; label: string; type: string; autoComplete: string; hint?: string }[] = [
  { name: "name", label: "Name:", type: "text", autoComplete: "name" },
  { name: "email", label: "Email:", type: "email", autoComplete: "email" },
  { name: "password", label: "Password:", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
  { name: "confirmPassword", label: "Confirm Password:", type: "password", autoComplete: "new-password" },
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
      <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={busy}>
        {fields.map((f) => (
          <TextField
            key={f.name}
            id={`${baseId}-${f.name}`}
            label={f.label}
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            value={values[f.name]}
            onChange={(e) => update(f.name, e.target.value)}
            disabled={busy}
            error={fieldErrors[f.name]}
            hint={f.hint}
          />
        ))}

        <FormError message={formError} />

        <button type="submit" disabled={busy} className={primaryButton}>
          {status === "creating" ? "Creating account…" : status === "signing-in" ? "Signing you in…" : "Sign up"}
        </button>
      </form>

      <AuthSwitchLink prompt="Already have an account?" href="/sign-in" label="Sign in" />
    </div>
  );
}
