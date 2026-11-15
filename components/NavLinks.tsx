"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const base =
  "sk flex h-9 items-center justify-center rounded-[12px] text-canvas sm:h-11 sm:rounded-[20px] lg:h-[76px]";
const active = "underline decoration-[3px] underline-offset-4";

export default function NavLinks() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <ul className="flex items-center gap-1 sm:gap-4 lg:gap-6">
      <li>
        <Link
          href="/upload"
          aria-label="Add item"
          aria-current={isActive("/upload") ? "page" : undefined}
          className={`${base} sk-btn-strong w-9 text-[34px] leading-none sm:w-11 sm:text-[44px] lg:w-[76px] lg:text-[90px] ${isActive("/upload") ? active : ""}`}
        >
          <span aria-hidden>
            +
          </span>
        </Link>
      </li>
      <li>
        <Link
          href="/review"
          aria-current={isActive("/review") ? "page" : undefined}
          className={`${base} sk-btn px-1.5 text-[15px] sm:px-4 sm:text-2xl lg:min-w-[154px] lg:text-[41px] ${isActive("/review") ? active : ""}`}
        >
          Review
        </Link>
      </li>
      <li>
        <Link
          href="/history"
          aria-current={isActive("/history") ? "page" : undefined}
          className={`${base} sk-btn-dark px-1.5 text-[15px] sm:px-4 sm:text-2xl lg:min-w-[154px] lg:text-[39px] ${isActive("/history") ? active : ""}`}
        >
          History
        </Link>
      </li>
    </ul>
  );
}
