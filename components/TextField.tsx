import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type Common = {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  /** Shown inside the box before the input, e.g. "$". */
  prefix?: ReactNode;
  suffix?: ReactNode;
};

const labelClass = "block text-[26px] leading-tight text-heading sm:text-[32px]";
const boxClass = (error?: string) =>
  `sk sk-field mt-2 flex items-center gap-2 rounded-[10px] px-4 ${error ? "[--sk-edge:var(--color-danger)]" : ""}`;
const inputClass =
  "min-w-0 flex-1 bg-transparent py-3 text-[22px] text-heading outline-none placeholder:text-faint sm:text-[23px]";

function Messages({ id, error, hint }: { id: string; error?: string; hint?: ReactNode }) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-lg text-muted sm:text-[22px]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-lg text-danger sm:text-xl">
          {error}
        </p>
      )}
    </>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode) =>
  [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

/** A labelled input in the Figma "Input Box" style (rough grey box). */
export default function TextField({
  id,
  label,
  error,
  hint,
  prefix,
  suffix,
  ...input
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className={boxClass(error)}>
        {prefix && <span className="text-[22px] text-heading">{prefix}</span>}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, hint)}
          className={inputClass}
          {...input}
        />
        {suffix && <span className="text-lg text-faint">{suffix}</span>}
      </div>
      <Messages id={id} error={error} hint={hint} />
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  error,
  hint,
  ...textarea
}: Omit<Common, "prefix" | "suffix"> & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className={`${boxClass(error)} items-stretch`}>
        <textarea
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, hint)}
          className={`${inputClass} min-h-[150px] resize-y`}
          {...textarea}
        />
      </div>
      <Messages id={id} error={error} hint={hint} />
    </div>
  );
}

/** Rough blue button used for primary form actions ("Sign in", "Sign up"). */
export const primaryButton =
  "sk sk-btn mx-auto flex h-[64px] min-w-[183px] items-center justify-center gap-2 rounded-[20px] px-6 text-[34px] text-canvas disabled:opacity-70 sm:h-[72px] sm:text-[41px]";

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="sk sk-field rounded-[10px] px-4 py-3 text-xl text-danger [--sk-edge:var(--color-danger)]">
      {message}
    </p>
  );
}
