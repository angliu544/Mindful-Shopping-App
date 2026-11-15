"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/auth-actions";

type Props = { name: string; email: string; avatarUrl: string | null };

export default function UserMenu({ name, email, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const pathname = usePathname();
  const label = name || email || "Account";

  // Close when navigating, clicking outside, or pressing Escape.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${label}`}
        className="relative block size-9 overflow-hidden rounded-full sm:size-11 lg:size-[85px]"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" fill sizes="85px" className="object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- static design asset
          <img src="/figma/profile-placeholder.svg" alt="" width={95} height={95} className="size-full" />
        )}
      </button>

      {open && (
        <div
          id={menuId}
          className="sk sk-tile absolute right-0 z-30 mt-3 w-[min(85vw,370px)] overflow-hidden rounded-[24px] pb-3 shadow-card"
        >
          <div className="bg-btn px-5 pb-4 pt-3 text-canvas">
            {name && <p className="truncate text-[26px] leading-tight sm:text-[32px]">{name}</p>}
            {email && <p className="truncate text-lg sm:text-[22px]">{email}</p>}
          </div>
          <div className="mx-5 h-0.5 bg-sage-50" aria-hidden />
          <Link
            href="/account"
            className="mx-2 mt-3 block rounded-[14px] bg-canvas px-4 py-3 text-2xl text-body hover:bg-sage-50 sm:text-[28px]"
          >
            Account settings
          </Link>
          <Link
            href="/settings"
            className="mx-2 mt-1 block rounded-[14px] bg-canvas px-4 py-3 text-2xl text-body hover:bg-sage-50 sm:text-[28px]"
          >
            Income settings
          </Link>
          <form action={signOutAction} onSubmit={() => setSigningOut(true)}>
            <button
              type="submit"
              disabled={signingOut}
              className="mx-2 mt-1 block w-[calc(100%-1rem)] rounded-[14px] px-4 py-3 text-left text-2xl text-danger hover:bg-sage-50 disabled:opacity-60 sm:text-[28px]"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
