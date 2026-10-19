export default function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-16 text-ink-muted">
      <span
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
