// The signed-in wallet's notifications, newest first, and marking them read.
import { Hono } from "hono";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthEnv } from "../auth";
import { schema, type Database } from "../db";

const readRequest = z.object({ ids: z.array(z.string().uuid()).max(100).optional() });

export function notificationRoutes({ db, sessionSecret, now }: { db: Database; sessionSecret: string; now: () => Date }) {
  const app = new Hono<AuthEnv>();
  app.use("*", requireAuth(sessionSecret, now));

  app.get("/", async (c) => {
    const mine = eq(schema.notifications.recipient, c.get("address"));
    const [rows, [{ unread }]] = await Promise.all([
      db
        .select({
          id: schema.notifications.id,
          kind: schema.notifications.kind,
          title: schema.notifications.title,
          body: schema.notifications.body,
          link: schema.notifications.link,
          createdAt: schema.notifications.createdAt,
          readAt: schema.notifications.readAt,
        })
        .from(schema.notifications)
        .where(mine)
        .orderBy(desc(schema.notifications.createdAt))
        .limit(50),
      db.select({ unread: count() }).from(schema.notifications).where(and(mine, isNull(schema.notifications.readAt))),
    ]);
    return c.json({ notifications: rows, unread });
  });

  /// Marks the given notifications read, or all of them when no ids are given.
  app.post("/read", async (c) => {
    const parsed = readRequest.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    await db
      .update(schema.notifications)
      .set({ readAt: now() })
      .where(
        and(
          eq(schema.notifications.recipient, c.get("address")),
          isNull(schema.notifications.readAt),
          parsed.data.ids ? inArray(schema.notifications.id, parsed.data.ids) : undefined,
        ),
      );
    return c.json({ ok: true });
  });

  return app;
}
