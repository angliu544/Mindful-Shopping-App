import type { ReactNode } from "react";

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="rounded-3xl border border-sage-100 bg-paper p-6 shadow-sm sm:p-8">
        <h1 className="font-serif text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-ink-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-sm text-ink-muted" aria-hidden>
      <span className="h-px flex-1 bg-sage-100" />
      or
      <span className="h-px flex-1 bg-sage-100" />
    </div>
  );
}
