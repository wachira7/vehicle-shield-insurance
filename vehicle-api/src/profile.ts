// The signed-in wallet's contact details. A wallet without a profile has signed in but not
// finished registering; the frontend asks for these details before anything else.
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import { z } from "zod";
import { requireAuth, type AuthEnv } from "./auth";
import { schema, type Database } from "./db";

const profileRequest = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(120),
  // Any country's number, in international form; stored as E.164 (e.g. +254712345678).
  phone: z
    .literal("")
    .transform(() => undefined)
    .or(
      z
        .string()
        .trim()
        .max(30)
        .transform((value, ctx) => {
          const number = parsePhoneNumberFromString(value);
          if (!number?.isValid()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid phone number with its country code, e.g. +254 712 345 678" });
            return z.NEVER;
          }
          return number.number;
        }),
    )
    .optional(),
  notifyEmail: z.boolean().optional(),
  notifySms: z.boolean().optional(),
});

export function profileRoutes({ db, sessionSecret, now }: { db: Database; sessionSecret: string; now: () => Date }) {
  const app = new Hono<AuthEnv>();
  app.use("*", requireAuth(sessionSecret, now));

  const describe = (row: typeof schema.profiles.$inferSelect | undefined) =>
    row
      ? { fullName: row.fullName, email: row.email, phone: row.phone, notifyEmail: row.notifyEmail, notifySms: row.notifySms, updatedAt: row.updatedAt }
      : null;

  app.get("/", async (c) => {
    const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.address, c.get("address")));
    return c.json({ address: c.get("address"), profile: describe(row) });
  });

  app.put("/", async (c) => {
    const parsed = profileRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      const fields = Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message]));
      return c.json({ error: "invalid_request", fields }, 400);
    }
    const values = { ...parsed.data, phone: parsed.data.phone ?? null, updatedAt: now() };
    const [row] = await db
      .insert(schema.profiles)
      .values({ address: c.get("address"), ...values })
      .onConflictDoUpdate({ target: schema.profiles.address, set: values })
      .returning();
    return c.json({ address: c.get("address"), profile: describe(row) });
  });

  return app;
}
