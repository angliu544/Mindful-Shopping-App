"use client";

import { useEffect, useState } from "react";
import { signOutAction } from "@/lib/auth-actions";

/**
 * Shown when a signed-in page fails to load (e.g. the database is unreachable).
 * Always offers a way out: retry, or sign out — signed-in visitors are otherwise
 * sent back here from "/" and the sign-in page.
 */
export default function PageError({ title, error, retry }: { title: string; error: unknown; retry: () => void }) {
  const [retrying, setRetrying] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  // If the retry fails again this screen simply stays, so re-enable the button.
  useEffect(() => {
    if (!retrying) return;
    const timer = setTimeout(() => setRetrying(false), 2500);
    return () => clearTimeout(timer);
  }, [retrying]);

  return (
    <div className="px-4 py-10 sm:py-16">
      <div role="alert" className="sk sk-outline mx-auto max-w-[657px] rounded-[48px] px-6 py-10 text-center sm:rounded-[69px] sm:px-12">
        <h1 className="text-[34px] leading-tight text-heading sm:text-[48px]">{title}</h1>
        <p className="mt-3 text-xl text-body sm:text-[26px]">
          Something went wrong on our side, so this page couldn&apos;t load. Try again in a moment, or sign out and back in.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setRetrying(true);
              retry();
            }}
            disabled={retrying}
            className="sk sk-btn flex h-16 w-full max-w-[251px] items-center justify-center rounded-full text-[28px] text-canvas disabled:opacity-70 sm:h-[80px] sm:text-[32px]"
          >
            {retrying ? "Trying…" : "Try again"}
          </button>
          <form action={signOutAction} onSubmit={() => setSigningOut(true)} className="w-full max-w-[251px]">
            <button
              type="submit"
              disabled={signingOut}
              className="sk sk-tile flex h-16 w-full items-center justify-center rounded-full text-[28px] text-danger disabled:opacity-70 sm:h-[80px] sm:text-[32px]"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
