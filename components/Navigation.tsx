import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import NavLinks from "@/components/NavLinks";
import UserMenu from "@/components/UserMenu";

export default function Navigation() {
  return (
    <header className="border-b border-sage-100 bg-paper/80 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3"
      >
        <Link href="/" className="font-serif text-lg font-semibold text-sage-700 rounded">
          Consider
        </Link>
        {/* The session is request-time data, so it streams in behind a boundary. */}
        <Suspense fallback={<div className="h-9" aria-hidden />}>
          <AuthControls />
        </Suspense>
      </nav>
    </header>
  );
}

async function AuthControls() {
  const session = await auth();
  const user = session?.user;

  if (user?.id) {
    return (
      <div className="flex items-center gap-2 sm:gap-4">
        <NavLinks />
        <UserMenu name={user.name ?? null} email={user.email ?? null} image={user.image ?? null} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <Link href="/sign-in" className="rounded-full px-4 py-2 text-sm font-medium text-ink hover:bg-sage-50">
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="rounded-full bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700"
      >
        Sign up
      </Link>
    </div>
  );
}
