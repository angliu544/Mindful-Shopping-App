import { requireUserId } from "@/lib/auth";

/** Temporary Phase 1 content for private pages. Verifies the user on the server. */
export default async function PhasePlaceholder({ title, body }: { title: string; body: string }) {
  await requireUserId();

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-serif text-3xl font-semibold">{title}</h1>
      <p className="mt-4 text-ink-muted">{body}</p>
    </div>
  );
}
