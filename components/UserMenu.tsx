"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/auth-actions";

type Props = { name: string | null; email: string | null; image: string | null };

export default function UserMenu({ name, email, image }: Props) {
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
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-sage-600 font-medium text-white"
      >
        {image ? (
          <Image src={image} alt="" width={36} height={36} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>{label.charAt(0).toUpperCase()}</span>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-sage-100 bg-paper shadow-lg"
        >
          <div className="border-b border-sage-100 px-4 py-3">
            {name && <p className="truncate font-medium text-ink">{name}</p>}
            {email && <p className="truncate text-sm text-ink-muted">{email}</p>}
          </div>
          <Link href="/settings" className="block px-4 py-3 text-sm text-ink hover:bg-sage-50">
            Income settings
          </Link>
          <form action={signOutAction} onSubmit={() => setSigningOut(true)}>
            <button
              type="submit"
              disabled={signingOut}
              className="block w-full px-4 py-3 text-left text-sm text-ink hover:bg-sage-50 disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
