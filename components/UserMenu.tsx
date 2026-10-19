"use client";

import { UserButton } from "@clerk/nextjs";

function CoinIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5v7M9.75 6.1c-.3-.5-.95-.85-1.75-.85-1 0-1.75.55-1.75 1.3 0 1.8 3.5.9 3.5 2.85 0 .75-.8 1.35-1.75 1.35-.85 0-1.55-.4-1.8-1" />
    </svg>
  );
}

export default function UserMenu() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link label="Income settings" labelIcon={<CoinIcon />} href="/settings" />
      </UserButton.MenuItems>
    </UserButton>
  );
}
