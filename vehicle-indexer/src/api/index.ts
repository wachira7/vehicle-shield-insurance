import { Hono } from "hono";
import { cors } from "hono/cors";
import { client, desc, asc, eq, graphql, inArray, replaceBigInts } from "ponder";
import { db } from "ponder:api";
import schema, { claim, claimEvent, policy, poolStats } from "ponder:schema";
import { isAddress } from "viem";
import { EMPTY_TOTALS, policyStatus } from "../lib";

const app = new Hono();

app.use("/v1/*", cors({ origin: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(","), allowMethods: ["GET"] }));
app.use("/graphql", graphql({ db, schema }));
app.use("/sql/*", client({ db, schema }));

// Amounts and times are bigints in the database; the API returns them as decimal strings.
const toJson = <T>(value: T) => replaceBigInts(value, (v) => v.toString());
const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000));
const isId = (value: string) => /^\d{1,30}$/.test(value);

type PolicyRow = typeof policy.$inferSelect;
const withStatus = (row: PolicyRow) => ({ ...row, status: policyStatus(row, nowSeconds()) });

/// Policies held by an address (newest first), or the latest policies when no holder is given.
app.get("/v1/policies", async (c) => {
  const holder = c.req.query("holder");
  if (holder !== undefined && !isAddress(holder)) return c.json({ error: "invalid_holder" }, 400);
  const rows = await db
    .select()
    .from(policy)
    .where(holder ? eq(policy.holder, holder.toLowerCase() as `0x${string}`) : undefined)
    .orderBy(desc(policy.id))
    .limit(100);
  return c.json(toJson({ policies: rows.map(withStatus) }));
});

/// One policy with its claims, each with its status timeline.
app.get("/v1/policies/:id", async (c) => {
  const id = c.req.param("id");
  if (!isId(id)) return c.json({ error: "invalid_id" }, 400);
  const [row] = await db.select().from(policy).where(eq(policy.id, BigInt(id)));
  if (!row) return c.json({ error: "not_found" }, 404);

  const claims = await db.select().from(claim).where(eq(claim.policyId, row.id)).orderBy(asc(claim.id));
  const events = claims.length
    ? await db
        .select()
        .from(claimEvent)
        .where(inArray(claimEvent.claimId, claims.map((x) => x.id)))
        .orderBy(asc(claimEvent.timestamp), asc(claimEvent.id))
    : [];
  return c.json(
    toJson({
      ...withStatus(row),
      claims: claims.map((x) => ({ ...x, timeline: events.filter((e) => e.claimId === x.id) })),
    }),
  );
});

app.get("/v1/claims/:id", async (c) => {
  const id = c.req.param("id");
  if (!isId(id)) return c.json({ error: "invalid_id" }, 400);
  const [row] = await db.select().from(claim).where(eq(claim.id, BigInt(id)));
  if (!row) return c.json({ error: "not_found" }, 404);
  const timeline = await db
    .select()
    .from(claimEvent)
    .where(eq(claimEvent.claimId, row.id))
    .orderBy(asc(claimEvent.timestamp), asc(claimEvent.id));
  return c.json(toJson({ ...row, timeline }));
});

/// Running totals for the public transparency page.
app.get("/v1/stats", async (c) => {
  const [row] = await db.select().from(poolStats).where(eq(poolStats.id, "global"));
  const { id: _id, ...totals } = row ?? { id: "global", ...EMPTY_TOTALS };
  return c.json(toJson(totals));
});

export default app;
