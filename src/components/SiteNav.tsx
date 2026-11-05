"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/#on-sale", label: "Tickets", accent: true },
  { href: "/scanner", label: "Scanner", accent: false },
  { href: "/admin", label: "Admin", accent: false },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.16em]">
      {LINKS.map((link) => {
        const active = !link.href.includes("#") && pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative py-1 transition ${
              active
                ? "text-ink"
                : link.accent
                  ? "text-accent hover:text-ink"
                  : "text-mute hover:text-ink"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-0.5 h-px bg-ink"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
