"use client";

import PageError from "@/components/PageError";

export default function HistoryError({ error, retry }: { error: unknown; retry: () => void }) {
  return <PageError title="We couldn't load your history" error={error} retry={retry} />;
}
