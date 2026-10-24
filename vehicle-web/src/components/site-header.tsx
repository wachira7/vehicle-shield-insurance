import Link from "next/link";
import { ButtonLink } from "./ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-action text-action-ink">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          VehicleShield
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-4">
          <Link href="/#how-it-works" className="hidden px-2 text-sm text-ink-muted hover:text-ink sm:block">
            How it works
          </Link>
          <Link href="/#transparency" className="hidden px-2 text-sm text-ink-muted hover:text-ink sm:block">
            Transparency
          </Link>
          <ButtonLink href="/quote" className="px-4 py-2">
            Get a quote
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
