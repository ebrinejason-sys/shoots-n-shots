"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/scanner", label: "Scanner" },
  { href: "/admin", label: "Admin" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-5 text-xs font-medium uppercase tracking-[0.14em]">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative py-1 transition ${
              active ? "text-ink" : "text-mute hover:text-ink"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-0.5 h-px bg-accent"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
