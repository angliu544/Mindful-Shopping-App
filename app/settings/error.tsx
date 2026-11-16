"use client";

import PageError from "@/components/PageError";

export default function SettingsError({ error, retry }: { error: unknown; retry: () => void }) {
  return <PageError title="We couldn't load your settings" error={error} retry={retry} />;
}
