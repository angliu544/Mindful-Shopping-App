"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/upload", label: "Add item" },
  { href: "/review", label: "Review" },
  { href: "/history", label: "History" },
] as const;

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-1 text-sm">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-2 font-medium transition-colors ${
                active ? "bg-sage-100 text-sage-700" : "text-ink-muted hover:bg-sage-50 hover:text-ink"
              }`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
