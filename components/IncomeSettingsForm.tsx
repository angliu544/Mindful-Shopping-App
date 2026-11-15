"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import TextField, { FormError, primaryButton } from "@/components/TextField";
import { DEFAULT_HOURS_PER_WEEK, formatWorkTime, workHoursFor } from "@/lib/income";
import { fieldErrorsOf, incomeSettingsSchema, parsePriceInput } from "@/lib/validations";
import type { ApiErrorBody } from "@/types/api";
import type { IncomeSettingsDTO, IncomeSettingsResponse, IncomeType } from "@/types/settings";

type FieldName = "incomeType" | "incomeAmount" | "hoursPerWeek";
type Status = "idle" | "saving" | "removing";

const EXAMPLE_PRICE = 100;

async function send(method: "PUT" | "DELETE", body?: unknown): Promise<IncomeSettingsResponse> {
  let res: Response;
  try {
    res = await fetch("/api/settings", {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw { error: "We couldn't reach the server. Check your connection and try again." } satisfies ApiErrorBody;
  }
  const data = (await res.json().catch(() => null)) as (IncomeSettingsResponse & Partial<ApiErrorBody>) | null;
  if (!res.ok || !data) {
    throw { error: data?.error ?? "Something went wrong. Please try again.", fieldErrors: data?.fieldErrors } satisfies ApiErrorBody;
  }
  return data;
}

export default function IncomeSettingsForm({ initial }: { initial: IncomeSettingsDTO | null }) {
  const ids = { amount: useId(), hours: useId() };
  const lockRef = useRef(false);

  const [saved, setSaved] = useState(initial);
  const [incomeType, setIncomeType] = useState<IncomeType>(initial?.incomeType ?? "hourly");
  const [amount, setAmount] = useState(initial ? String(initial.incomeAmount) : "");
  const [hours, setHours] = useState(String(initial?.hoursPerWeek ?? DEFAULT_HOURS_PER_WEEK));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const busy = status !== "idle";

  const draft = incomeSettingsSchema.safeParse({
    incomeType,
    incomeAmount: parsePriceInput(amount),
    // Hourly pay is just the rate for one hour; hours only matter for a salary.
    hoursPerWeek: incomeType === "salary" ? Number(hours) : null,
  });
  const previewHours = draft.success ? workHoursFor(EXAMPLE_PRICE, draft.data) : null;

  /** Editing a field clears its stale error and any form-level messages. */
  function clearError(field: FieldName) {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError(null);
    setMessage(null);
  }

  async function run(nextStatus: Status, action: () => Promise<IncomeSettingsResponse>, success: string) {
    if (lockRef.current) return;
    lockRef.current = true;
    setStatus(nextStatus);
    setFormError(null);
    setMessage(null);
    try {
      const { settings } = await action();
      setSaved(settings);
      setMessage(success);
    } catch (error) {
      const err = error as ApiErrorBody;
      setFormError(err.error);
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
    } finally {
      setStatus("idle");
      lockRef.current = false;
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft.success) {
      setFieldErrors(fieldErrorsOf(draft.error));
      setFormError("Please fix the highlighted fields.");
      setMessage(null);
      return;
    }
    setFieldErrors({});
    void run("saving", () => send("PUT", draft.data), "Saved. Your review cards will now show work time.");
  }

  function handleRemove() {
    void run(
      "removing",
      async () => {
        const res = await send("DELETE");
        setAmount("");
        setHours(String(DEFAULT_HOURS_PER_WEEK));
        return res;
      },
      "Income removed. Cards will show price only.",
    );
  }

  const pill = (active: boolean) =>
    `sk flex min-h-[60px] cursor-pointer items-center justify-center rounded-[20px] px-4 text-center text-2xl transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link sm:min-h-[72px] sm:text-[32px] ${
      active ? "sk-btn text-canvas" : "sk-tile text-body hover:brightness-[0.98]"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8" aria-busy={busy}>
      <fieldset>
        <legend className="text-[26px] leading-tight text-heading sm:text-[32px]">How are you paid?</legend>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
          {(["hourly", "salary"] as const).map((type) => (
            <label key={type} className={pill(incomeType === type)}>
              <input
                type="radio"
                name="incomeType"
                value={type}
                checked={incomeType === type}
                onChange={() => {
                  setIncomeType(type);
                  clearError("incomeAmount");
                }}
                disabled={busy}
                className="sr-only"
              />
              {type === "hourly" ? "Hourly" : "Yearly salary"}
            </label>
          ))}
        </div>
      </fieldset>

      <TextField
        id={ids.amount}
        label={incomeType === "hourly" ? "Hourly pay (USD)" : "Yearly salary (USD)"}
        prefix="$"
        suffix={incomeType === "hourly" ? "/ hour" : "/ year"}
        inputMode="decimal"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          clearError("incomeAmount");
        }}
        placeholder={incomeType === "hourly" ? "25.00" : "60,000"}
        autoComplete="off"
        disabled={busy}
        error={fieldErrors.incomeAmount}
        hint="Tip: use your take-home (after-tax) pay for a more honest number."
      />

      {/* Only a salary needs hours to work out an hourly rate. */}
      {incomeType === "salary" && (
        <TextField
          id={ids.hours}
          label="Hours you work per week"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          value={hours}
          onChange={(e) => {
            setHours(e.target.value);
            clearError("hoursPerWeek");
          }}
          disabled={busy}
          error={fieldErrors.hoursPerWeek}
          hint="Used to turn your salary into an hourly rate."
        />
      )}

      <div className="sk sk-panel rounded-[32px] px-6 py-5 text-xl text-body sm:text-[26px]" aria-live="polite">
        {previewHours !== null && draft.success ? (
          <>
            A $100 item would take about{" "}
            <span className="text-deep">{formatWorkTime(previewHours, draft.data.hoursPerWeek)}</span> of work.
          </>
        ) : (
          "Enter your income to see what a $100 item costs in work time."
        )}
      </div>

      <FormError message={formError} />
      {message && (
        <p role="status" className="sk sk-badge-skip rounded-[14px] px-4 py-3 text-xl text-deep sm:text-[24px]">
          {message}
        </p>
      )}

      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button type="submit" disabled={busy} className={`${primaryButton} mx-0 w-full sm:w-auto`}>
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        {saved && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="sk sk-tile flex h-[64px] w-full items-center justify-center rounded-[20px] px-6 text-[28px] text-danger disabled:opacity-70 sm:h-[72px] sm:w-auto sm:text-[34px]"
          >
            {status === "removing" ? "Removing…" : "Remove income"}
          </button>
        )}
      </div>

      <p className="text-center text-lg text-muted sm:text-[22px]">
        Your income is stored with your account and only used to show work time on your cards.
      </p>
    </form>
  );
}
