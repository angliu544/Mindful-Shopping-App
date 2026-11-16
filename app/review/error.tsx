"use client";

import PageError from "@/components/PageError";

export default function ReviewError({ error, retry }: { error: unknown; retry: () => void }) {
  return <PageError title="We couldn't load your items" error={error} retry={retry} />;
}
