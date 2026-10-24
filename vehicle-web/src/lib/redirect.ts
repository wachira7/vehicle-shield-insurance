const AUTH_PAGES = ["/signin", "/register"];

/// Where to go after signing in or saving details. Only same-site paths are allowed (no open
/// redirects), and never the sign-in or details pages themselves, which would loop.
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  const path = next.split(/[?#]/)[0];
  return AUTH_PAGES.some((page) => path === page || path.startsWith(`${page}/`)) ? fallback : next;
}
