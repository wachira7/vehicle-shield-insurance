"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

const NAV = [
  { href: "/assessor", label: "Overview", icon: icon(<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" />) },
  {
    href: "/assessor/claims",
    label: "Claims",
    icon: icon(
      <>
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5M10 13h6M10 17h4" />
      </>,
    ),
  },
  {
    href: "/assessor/vehicles",
    label: "Vehicles",
    icon: icon(
      <>
        <path d="M5 16V11l2-5h10l2 5v5" />
        <path d="M3 16h18v3H3z" />
      </>,
    ),
  },
  {
    href: "/assessor/history",
    label: "History",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </>,
    ),
  },
  {
    href: "/assessor/account",
    label: "Account",
    icon: icon(
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </>,
    ),
  },
];

const isActive = (pathname: string, href: string) =>
  href === "/assessor" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

/// The staff workspace's navigation: a sidebar on large screens, a tab bar on phones.
export function StaffNav() {
  const pathname = usePathname();
  return (
    <>
      <nav aria-label="Assessor console" className="sticky top-24 hidden w-52 shrink-0 self-start lg:block">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-action/30 bg-action/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-action">
          <span className="size-1.5 rounded-full bg-action" /> Assessor
        </p>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-action/10 text-ink" : "text-ink-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  <span className={active ? "text-action" : ""}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="Assessor console"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${active ? "text-action" : "text-ink-faint"}`}
                >
                  <span className={`transition-transform duration-200 ${active ? "-translate-y-0.5" : ""}`}>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
