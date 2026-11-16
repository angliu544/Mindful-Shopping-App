"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import TextField, { FormError, primaryButton } from "@/components/TextField";
import { ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { UploadError, uploadToCloudinary } from "@/lib/upload-client";
import { accountNameSchema, changePasswordSchema, fieldErrorsOf, validateImageFile } from "@/lib/validations";
import type { AccountDTO, AccountResponse } from "@/types/account";
import type { ApiErrorBody, UploadSignature } from "@/types/api";

class RequestError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new RequestError("We couldn't reach the server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
  if (!res.ok || !data) throw new RequestError(data?.error ?? "Something went wrong. Please try again.", data?.fieldErrors);
  return data;
}

const messageOf = (error: unknown) =>
  error instanceof RequestError || error instanceof UploadError ? error.message : "Something went wrong. Please try again.";

const secondaryButton =
  "sk sk-tile flex h-[56px] items-center justify-center rounded-[20px] px-6 text-2xl text-body hover:brightness-[0.98] disabled:opacity-70 sm:h-[64px] sm:text-[28px]";

export default function AccountSettings({ initial }: { initial: AccountDTO }) {
  const [account, setAccount] = useState(initial);
  return (
    <div className="space-y-10 sm:space-y-12">
      <AvatarSection account={account} onChange={setAccount} />
      <NameSection account={account} onChange={setAccount} />
      <PasswordSection />
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="sk sk-panel rounded-[32px] px-5 py-6 sm:px-8 sm:py-8">
      <h2 id={id} className="text-[28px] leading-tight text-heading sm:text-[36px]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Success({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="sk sk-badge-skip rounded-[14px] px-4 py-3 text-xl text-deep sm:text-[24px]">
      {message}
    </p>
  );
}

type SectionProps = { account: AccountDTO; onChange: (account: AccountDTO) => void };

function AvatarSection({ account, onChange }: SectionProps) {
  const router = useRouter();
  const inputId = useId();
  const lockRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "removing">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const busy = status !== "idle";

  // Free the local preview once it's no longer shown.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function run(next: "uploading" | "removing", action: () => Promise<AccountResponse>, success: string) {
    if (lockRef.current) return;
    lockRef.current = true;
    setStatus(next);
    setError(null);
    setMessage(null);
    try {
      const { account: updated } = await action();
      onChange(updated);
      setMessage(success);
      router.refresh(); // update the picture in the navigation bar
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setPreview(null);
      setStatus("idle");
      lockRef.current = false;
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = ""; // allow choosing the same file again later
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      setMessage(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
    void run(
      "uploading",
      async () => {
        const signature = await send<UploadSignature>("/api/uploads/signature?purpose=avatar", "POST");
        const imagePublicId = await uploadToCloudinary(file, signature);
        return send<AccountResponse>("/api/account/avatar", "PUT", { imagePublicId });
      },
      "Profile picture updated.",
    );
  }

  const shown = preview ?? account.avatarUrl;

  return (
    <Section id="account-photo" title="Profile picture">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
        <div className="relative size-32 shrink-0 overflow-hidden rounded-full bg-sage-50 sm:size-36" data-testid="account-avatar">
          {shown ? (
            preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
              <img src={preview} alt="Your new profile picture" className="size-full object-cover" />
            ) : (
              <Image src={shown} alt="Your profile picture" fill sizes="144px" className="object-cover" />
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- static design asset
            <img src="/figma/profile-placeholder.svg" alt="No profile picture yet" className="size-full" />
          )}
          {status === "uploading" && (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/40 text-lg text-canvas">Uploading…</span>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto">
          <input
            id={inputId}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={handleFile}
            disabled={busy}
            className="peer sr-only"
          />
          <label
            htmlFor={inputId}
            aria-disabled={busy}
            className={`${primaryButton} mx-0 w-full cursor-pointer text-[28px] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-link sm:w-auto sm:text-[32px] ${
              busy ? "pointer-events-none opacity-70" : ""
            }`}
          >
            {status === "uploading" ? "Uploading…" : account.avatarUrl ? "Change photo" : "Add a photo"}
          </label>
          {account.avatarUrl && (
            <button
              type="button"
              onClick={() => run("removing", () => send<AccountResponse>("/api/account/avatar", "DELETE"), "Profile picture removed.")}
              disabled={busy}
              className={`${secondaryButton} text-danger`}
            >
              {status === "removing" ? "Removing…" : "Remove photo"}
            </button>
          )}
          <p className="text-lg text-muted sm:text-[22px]">JPEG, PNG, or WebP, up to 5 MB.</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <FormError message={error} />
        <Success message={message} />
      </div>
    </Section>
  );
}

function NameSection({ account, onChange }: SectionProps) {
  const router = useRouter();
  const id = useId();
  const lockRef = useRef(false);
  const [name, setName] = useState(account.name);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const unchanged = name.trim() === account.name;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lockRef.current) return;
    const parsed = accountNameSchema.safeParse({ name });
    if (!parsed.success) {
      setFieldError(fieldErrorsOf(parsed.error).name);
      setMessage(null);
      return;
    }
    lockRef.current = true;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { account: updated } = await send<AccountResponse>("/api/account", "PATCH", parsed.data);
      onChange(updated);
      setName(updated.name);
      setMessage("Name saved.");
      router.refresh(); // update the name in the navigation bar
    } catch (err) {
      setError(messageOf(err));
      if (err instanceof RequestError && err.fieldErrors?.name) setFieldError(err.fieldErrors.name);
    } finally {
      setSaving(false);
      lockRef.current = false;
    }
  }

  return (
    <Section id="account-name" title="Your details">
      <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={saving}>
        <TextField
          id={id}
          label="Name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setFieldError(undefined);
            setError(null);
            setMessage(null);
          }}
          disabled={saving}
          error={fieldError}
        />
        <div>
          <p className="block text-[26px] leading-tight text-heading sm:text-[32px]">Email</p>
          <p className="mt-2 break-all text-[22px] text-body sm:text-[23px]">{account.email}</p>
        </div>
        <FormError message={error} />
        <Success message={message} />
        <button type="submit" disabled={saving || unchanged} className={`${primaryButton} mx-0 w-full sm:w-auto`}>
          {saving ? "Saving…" : "Save name"}
        </button>
      </form>
    </Section>
  );
}

type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";
const emptyPasswords: Record<PasswordField, string> = { currentPassword: "", newPassword: "", confirmPassword: "" };

function PasswordSection() {
  const baseId = useId();
  const lockRef = useRef(false);
  const [values, setValues] = useState(emptyPasswords);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PasswordField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fields: { name: PasswordField; label: string; autoComplete: string; hint?: string }[] = [
    { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
    { name: "newPassword", label: "New password", autoComplete: "new-password", hint: "At least 8 characters." },
    { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
  ];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lockRef.current) return;
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsOf(parsed.error));
      setError("Please fix the highlighted fields.");
      setMessage(null);
      return;
    }
    lockRef.current = true;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await send<{ ok: true }>("/api/account/password", "POST", parsed.data);
      setValues(emptyPasswords);
      setFieldErrors({});
      setMessage("Password changed. Use your new password next time you sign in.");
    } catch (err) {
      setError(messageOf(err));
      if (err instanceof RequestError && err.fieldErrors) setFieldErrors(err.fieldErrors);
    } finally {
      setSaving(false);
      lockRef.current = false;
    }
  }

  return (
    <Section id="account-password" title="Change password">
      <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={saving}>
        {fields.map((f) => (
          <TextField
            key={f.name}
            id={`${baseId}-${f.name}`}
            label={f.label}
            name={f.name}
            type="password"
            autoComplete={f.autoComplete}
            value={values[f.name]}
            onChange={(e) => {
              setValues((v) => ({ ...v, [f.name]: e.target.value }));
              setFieldErrors((errs) => ({ ...errs, [f.name]: undefined }));
              setError(null);
              setMessage(null);
            }}
            disabled={saving}
            error={fieldErrors[f.name]}
            hint={f.hint}
          />
        ))}
        <FormError message={error} />
        <Success message={message} />
        <button type="submit" disabled={saving} className={`${primaryButton} mx-0 w-full sm:w-auto`}>
          {saving ? "Changing…" : "Change password"}
        </button>
      </form>
    </Section>
  );
}
