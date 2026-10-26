// Per-client request limits: fixed one-minute windows counted in memory. Fine for a single API
// instance; behind several, move the counts to the shared database or the load balancer.
import type { Context, MiddlewareHandler } from "hono";

/// The caller's address as the hosting proxies report it. Cloudflare (in front of Render) sets
/// cf-connecting-ip and doesn't let clients override it; X-Forwarded-For is the fallback.
export function clientIp(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("true-client-ip") ||
    c.req.header("x-real-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
    "direct"
  );
}

export function rateLimit({
  limit,
  now = () => new Date(),
  windowMs = 60_000,
  reason = "Too many requests. Try again in a minute.",
}: {
  limit: number;
  now?: () => Date;
  windowMs?: number;
  reason?: string;
}): MiddlewareHandler {
  const windows = new Map<string, { count: number; resetAt: number }>();
  return async (c, next) => {
    const client = clientIp(c);
    const time = now().getTime();
    const window = windows.get(client);
    if (!window || window.resetAt <= time) {
      if (windows.size > 10_000) windows.clear();
      windows.set(client, { count: 1, resetAt: time + windowMs });
    } else if (++window.count > limit) {
      c.header("Retry-After", String(Math.ceil((window.resetAt - time) / 1000)));
      return c.json({ error: "rate_limited", reason }, 429);
    }
    await next();
  };
}
