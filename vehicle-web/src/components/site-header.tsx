import Link from "next/link";
import { Logo } from "./logo";
import { ButtonLink } from "./ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-4">
          <Link href="/#how-it-works" className="hidden px-2 text-sm text-ink-muted hover:text-ink sm:block">
            How it works
          </Link>
          <Link href="/#transparency" className="hidden px-2 text-sm text-ink-muted hover:text-ink sm:block">
            Transparency
          </Link>
          <Link href="/signin" className="px-2 text-sm font-medium text-ink-muted hover:text-ink">
            Sign in
          </Link>
          <ButtonLink href="/quote" className="px-4 py-2">
            Get a quote
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
