/// Only same-site paths are allowed as a post-sign-in destination (no open redirects).
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
