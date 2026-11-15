import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { auth } from "@/auth";
import NavLinks from "@/components/NavLinks";
import UserMenu from "@/components/UserMenu";

export const navButton =
  "sk flex h-10 items-center justify-center rounded-[14px] px-2.5 text-lg text-canvas sm:h-11 sm:rounded-[20px] sm:px-4 sm:text-2xl lg:h-[76px] lg:min-w-[154px] lg:text-[39px]";

export default function Navigation() {
  return (
    <header className="px-2 pt-2 sm:px-0 sm:pt-0">
      <nav
        aria-label="Main"
        className="sk sk-bar flex min-h-14 flex-wrap items-center justify-between gap-2 rounded-[7px] px-2 py-2 sm:min-h-[110px] sm:px-5 lg:px-6"
      >
        <Link href="/" className="rounded text-[26px] leading-none text-canvas sm:text-[56px] lg:text-[74px]">
          Consider
        </Link>
        {/* The session is request-time data, so it streams in behind a boundary. */}
        <Suspense fallback={<div className="h-9 sm:h-11 lg:h-[76px]" aria-hidden />}>
          <AuthControls />
        </Suspense>
      </nav>
    </header>
  );
}

async function AuthControls() {
  // Per-request: Auth.js generates random CSRF tokens, which Next must not prerender.
  await connection();
  const session = await auth();
  const user = session?.user;

  if (user?.id) {
    return (
      <div className="flex items-center gap-1 sm:gap-4 lg:gap-6">
        <NavLinks />
        <UserMenu name={user.name ?? null} email={user.email ?? null} image={user.image ?? null} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4 lg:gap-9">
      <Link href="/sign-up" className={`${navButton} sk-btn`}>
        Sign up
      </Link>
      <Link href="/sign-in" className={`${navButton} sk-btn-dark`}>
        Sign in
      </Link>
    </div>
  );
}
