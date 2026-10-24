"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useIsAssessor } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { Logo } from "./logo";
import { NotificationBell } from "./notification-bell";
import { ButtonLink } from "./ui";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <NotificationBell />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

function AccountMenu() {
  const { status, address, profile, signOut } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const staff = useIsAssessor().data === true;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (status === "loading") return <div className="h-10 w-28 animate-pulse rounded-xl bg-surface" aria-hidden />;
  if (status === "signed-out") {
    return pathname.startsWith("/signin") ? null : (
      <ButtonLink href={`/signin?next=${encodeURIComponent(pathname)}`} className="px-4 py-2">
        Sign in
      </ButtonLink>
    );
  }

  const name = profile?.fullName ?? shortAddress(address!);
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-3 text-sm hover:bg-surface-2"
      >
        <span className="grid size-7 place-items-center rounded-lg bg-action/15 text-xs font-semibold text-action">
          {profile?.fullName ? initials(profile.fullName) : "●"}
        </span>
        <span className="max-w-32 truncate font-medium">{name}</span>
        <span aria-hidden className={`text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      <div
        role="menu"
        className={`absolute right-0 mt-2 w-60 origin-top-right rounded-2xl border border-line bg-surface p-2 shadow-2xl shadow-black/40 transition duration-150 ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="px-3 py-2">
          <p className="flex items-center gap-2 truncate text-sm font-medium">
            {profile?.fullName ?? "Your account"}
            {staff && <span className="rounded-full bg-action/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-action">Assessor</span>}
          </p>
          <p className="font-mono text-xs text-ink-faint">{shortAddress(address!)}</p>
        </div>
        <div className="my-1 h-px bg-line" />
        <Link role="menuitem" href={staff ? "/assessor" : "/dashboard"} className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
          {staff ? "Assessor console" : "Dashboard"}
        </Link>
        <Link role="menuitem" href={staff ? "/assessor/account" : "/dashboard/account"} className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
          Account
        </Link>
        {!staff && (
          <Link role="menuitem" href="/quote" className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
            Get a quote
          </Link>
        )}
        <button
          role="menuitem"
          type="button"
          onClick={() => signOut({ disconnectWallet: true })}
          className="block w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-surface-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
