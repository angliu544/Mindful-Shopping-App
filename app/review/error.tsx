"use client";

import { useEffect } from "react";

export default function ReviewError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-serif text-2xl font-semibold">We couldn&apos;t load your items</h1>
      <p className="mt-3 text-ink-muted">This is usually temporary. Please try again in a moment.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-8 rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700"
      >
        Try again
      </button>
    </div>
  );
}
