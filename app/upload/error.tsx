"use client";

import PageError from "@/components/PageError";

export default function UploadError({ error, retry }: { error: unknown; retry: () => void }) {
  return <PageError title="We couldn't open this page" error={error} retry={retry} />;
}
