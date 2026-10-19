"use client";

import { useId, useRef, useState, type FormEvent } from "react";
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

  const describedBy = (field: FieldName, extra?: string) =>
    [extra, fieldErrors[field] ? `${field}-error` : undefined].filter(Boolean).join(" ") || undefined;
  const inputClass = (field: FieldName) =>
    `mt-2 block w-full rounded-2xl border bg-paper px-4 py-3 text-ink ${fieldErrors[field] ? "border-red-400" : "border-sage-200"}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6" aria-busy={busy}>
      <fieldset>
        <legend className="font-medium">How are you paid?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-full bg-sage-50 p-1">
          {(["hourly", "salary"] as const).map((type) => (
            <label
              key={type}
              className={`cursor-pointer rounded-full px-4 py-2 text-center font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sage-600 ${
                incomeType === type ? "bg-sage-600 text-white shadow-sm" : "text-ink-muted hover:bg-paper hover:text-ink"
              }`}
            >
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

      <div>
        <label htmlFor={ids.amount} className="block font-medium">
          {incomeType === "hourly" ? "Hourly pay (USD)" : "Yearly salary (USD)"}
        </label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-muted">
            $
          </span>
          <input
            id={ids.amount}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              clearError("incomeAmount");
            }}
            placeholder={incomeType === "hourly" ? "25.00" : "60,000"}
            autoComplete="off"
            disabled={busy}
            aria-invalid={!!fieldErrors.incomeAmount}
            aria-describedby={describedBy("incomeAmount", `${ids.amount}-hint`)}
            className={`${inputClass("incomeAmount")} pl-8 pr-20`}
          />
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-ink-muted">
            {incomeType === "hourly" ? "/ hour" : "/ year"}
          </span>
        </div>
        <p id={`${ids.amount}-hint`} className="mt-1 text-sm text-ink-muted">
          Tip: use your take-home (after-tax) pay for a more honest number.
        </p>
        {fieldErrors.incomeAmount && (
          <p id="incomeAmount-error" className="mt-1 text-sm text-red-700">
            {fieldErrors.incomeAmount}
          </p>
        )}
      </div>

      {/* Only a salary needs hours to work out an hourly rate. */}
      {incomeType === "salary" && (
        <div>
          <label htmlFor={ids.hours} className="block font-medium">
            Hours you work per week
          </label>
          <input
            id={ids.hours}
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
            aria-invalid={!!fieldErrors.hoursPerWeek}
            aria-describedby={describedBy("hoursPerWeek", `${ids.hours}-hint`)}
            className={inputClass("hoursPerWeek")}
          />
          <p id={`${ids.hours}-hint`} className="mt-1 text-sm text-ink-muted">
            Used to turn your salary into an hourly rate.
          </p>
          {fieldErrors.hoursPerWeek && (
            <p id="hoursPerWeek-error" className="mt-1 text-sm text-red-700">
              {fieldErrors.hoursPerWeek}
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-sage-50 px-4 py-3 text-sm text-ink-muted" aria-live="polite">
        {previewHours !== null && draft.success ? (
          <>
            A $100 item would take about{" "}
            <span className="font-medium text-ink">{formatWorkTime(previewHours, draft.data.hoursPerWeek)}</span> of work.
          </>
        ) : (
          "Enter your income to see what a $100 item costs in work time."
        )}
      </div>

      {formError && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {formError}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-2xl bg-sage-100 px-4 py-3 text-sm text-sage-700">
          {message}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700 disabled:opacity-70"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        {saved && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="rounded-full border border-sage-200 px-6 py-3 font-medium hover:bg-sage-50 disabled:opacity-70"
          >
            {status === "removing" ? "Removing…" : "Remove income"}
          </button>
        )}
      </div>

      <p className="text-xs text-ink-muted">
        Your income is stored with your account and only used to show work time on your cards.
      </p>
    </form>
  );
}
