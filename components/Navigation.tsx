import { Suspense } from "react";
import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
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
        {/* Auth state is request-time data, so it streams in behind a boundary. */}
        <Suspense fallback={<div className="h-9" aria-hidden />}>
          <AuthControls />
        </Suspense>
      </nav>
    </header>
  );
}

function AuthControls() {
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <Show when="signed-in">
        <NavLinks />
        <UserMenu />
      </Show>
      <Show when="signed-out">
        <SignInButton>
          <button className="rounded-full px-4 py-2 text-sm font-medium text-ink hover:bg-sage-50">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton>
          <button className="rounded-full bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700">
            Sign up
          </button>
        </SignUpButton>
      </Show>
    </div>
  );
}
