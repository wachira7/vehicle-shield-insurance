"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useIsAssessor } from "@/lib/queries";

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

export const NAV = [
  { href: "/dashboard", label: "Home", icon: icon(<path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" />) },
  {
    href: "/dashboard/vehicles",
    label: "Vehicles",
    icon: icon(
      <>
        <path d="M5 16V11l2-5h10l2 5v5" />
        <path d="M3 16h18v3H3z" />
        <circle cx="7.5" cy="16" r="1.5" />
        <circle cx="16.5" cy="16" r="1.5" />
      </>,
    ),
  },
  {
    href: "/dashboard/policies",
    label: "Policies",
    icon: icon(<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />),
  },
  {
    href: "/dashboard/claims",
    label: "Claims",
    icon: icon(
      <>
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5M10 13h6M10 17h4" />
      </>,
    ),
  },
  {
    href: "/dashboard/account",
    label: "Account",
    icon: icon(
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </>,
    ),
  },
];

/// Shown only to wallets holding ASSESSOR_ROLE.
const ASSESSOR_ITEM = {
  href: "/dashboard/assessor",
  label: "Assess",
  icon: icon(
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5M8.5 11l2 2 3.5-4" />
    </>,
  ),
};

const isActive = (pathname: string, href: string) =>
  href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

/// Sidebar on large screens, a thumb-friendly tab bar on phones.
export function DashboardNav() {
  const pathname = usePathname();
  const assessor = useIsAssessor();
  // The account link stays last; the assessor link sits just before it.
  const items = assessor.data ? [...NAV.slice(0, -1), ASSESSOR_ITEM, NAV[NAV.length - 1]] : NAV;
  return (
    <>
      <nav aria-label="Dashboard" className="sticky top-24 hidden w-52 shrink-0 self-start lg:block">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="animate-step-in">
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
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className={`grid ${items.length > 5 ? "grid-cols-6" : "grid-cols-5"}`}>
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                    active ? "text-action" : "text-ink-faint"
                  }`}
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
