export default function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-6 py-24 text-body sm:py-32">
      <span
        aria-hidden
        style={{ filter: "url(#sketch)" }}
        className="size-20 animate-spin rounded-full border-[8px] border-panel-edge border-t-btn [animation-duration:1.1s] sm:size-28 sm:border-[10px]"
      />
      <span className="text-[28px] sm:text-[40px]">{label}</span>
    </div>
  );
}
