import type { ReactNode } from "react";

export default function EmptyState({
  title,
  children,
  actions,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-sage-100 bg-paper px-6 py-12 text-center">
      <div aria-hidden className="mx-auto h-12 w-12 rounded-full bg-sage-100" />
      <h2 className="mt-5 font-serif text-2xl font-semibold">{title}</h2>
      {children && <div className="mx-auto mt-3 max-w-sm text-ink-muted">{children}</div>}
      {actions && <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">{actions}</div>}
    </div>
  );
}
