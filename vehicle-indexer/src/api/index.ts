import { Hono } from "hono";
import { cors } from "hono/cors";
import { and, client, desc, asc, eq, graphql, gte, inArray, lt, or, replaceBigInts } from "ponder";
import { db } from "ponder:api";
import schema, { claim, claimEvent, policy, poolStats } from "ponder:schema";
import { isAddress, isHex } from "viem";
import { EMPTY_TOTALS, parseClaimStatuses, policyStatus } from "../lib";

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

/// Policies, newest first: held by `?holder=`, covering `?vehicleId=` (the on-chain vehicle
/// hash), not cancelled and ending in `[endAfter, endBefore)` (unix seconds; for renewal
/// reminders), or the latest policies when none is given.
app.get("/v1/policies", async (c) => {
  const holder = c.req.query("holder");
  const vehicleId = c.req.query("vehicleId");
  const endAfter = c.req.query("endAfter");
  const endBefore = c.req.query("endBefore");
  if (holder !== undefined && !isAddress(holder)) return c.json({ error: "invalid_holder" }, 400);
  if (vehicleId !== undefined && !(isHex(vehicleId) && vehicleId.length === 66)) return c.json({ error: "invalid_vehicle_id" }, 400);
  if ([endAfter, endBefore].some((value) => value !== undefined && !isId(value))) return c.json({ error: "invalid_time" }, 400);
  const rows = await db
    .select()
    .from(policy)
    .where(
      and(
        holder ? eq(policy.holder, holder.toLowerCase() as `0x${string}`) : undefined,
        vehicleId ? eq(policy.vehicleId, vehicleId.toLowerCase() as `0x${string}`) : undefined,
        endAfter ? gte(policy.endTime, BigInt(endAfter)) : undefined,
        endBefore ? lt(policy.endTime, BigInt(endBefore)) : undefined,
        endAfter || endBefore ? eq(policy.cancelled, false) : undefined,
      ),
    )
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

/// Claims oldest first, optionally by `?status=Submitted,UnderReview`: the assessor's queue.
app.get("/v1/claims", async (c) => {
  const statuses = parseClaimStatuses(c.req.query("status"));
  if (statuses === null) return c.json({ error: "invalid_status" }, 400);
  const rows = await db
    .select()
    .from(claim)
    .where(statuses ? inArray(claim.status, statuses) : undefined)
    .orderBy(asc(claim.id))
    .limit(200);
  return c.json(toJson({ claims: rows }));
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

/// Review decisions (approvals and declines), newest first, optionally by the wallet that made
/// them: an assessor's history. Each comes with its claim's amounts.
app.get("/v1/decisions", async (c) => {
  const actor = c.req.query("actor");
  if (actor !== undefined && !isAddress(actor)) return c.json({ error: "invalid_actor" }, 400);
  const events = await db
    .select()
    .from(claimEvent)
    .where(
      and(
        inArray(claimEvent.status, ["Approved", "Rejected"]),
        actor ? eq(claimEvent.actor, actor.toLowerCase() as `0x${string}`) : undefined,
      ),
    )
    .orderBy(desc(claimEvent.timestamp), desc(claimEvent.id))
    .limit(100);
  const claims = events.length
    ? await db.select().from(claim).where(inArray(claim.id, [...new Set(events.map((e) => e.claimId))]))
    : [];
  const byId = new Map(claims.map((row) => [row.id, row]));
  return c.json(toJson({ decisions: events.map((event) => ({ ...event, claim: byId.get(event.claimId) ?? null })) }));
});

/// Everything that happened at or after `?since=` (unix seconds), oldest first, for the
/// notification worker: claim status changes (with the claim) and policies bought or cancelled.
/// Items sharing the boundary second can come back on the next call; callers deduplicate.
app.get("/v1/activity", async (c) => {
  const since = c.req.query("since") ?? "0";
  if (!isId(since)) return c.json({ error: "invalid_since" }, 400);
  const from = BigInt(since);
  const [events, policies] = await Promise.all([
    db.select().from(claimEvent).where(gte(claimEvent.timestamp, from)).orderBy(asc(claimEvent.timestamp), asc(claimEvent.id)).limit(500),
    db
      .select()
      .from(policy)
      .where(or(gte(policy.startTime, from), and(eq(policy.cancelled, true), gte(policy.cancelledAt, from))))
      .orderBy(asc(policy.id))
      .limit(500),
  ]);
  const claims = events.length
    ? await db.select().from(claim).where(inArray(claim.id, [...new Set(events.map((e) => e.claimId))]))
    : [];
  const byId = new Map(claims.map((row) => [row.id, row]));
  return c.json(
    toJson({
      claimEvents: events.map((event) => ({ ...event, claim: byId.get(event.claimId) ?? null })),
      policies: policies.map(withStatus),
    }),
  );
});

/// Running totals for the public transparency page.
app.get("/v1/stats", async (c) => {
  const [row] = await db.select().from(poolStats).where(eq(poolStats.id, "global"));
  const { id: _id, ...totals } = row ?? { id: "global", ...EMPTY_TOTALS };
  return c.json(toJson(totals));
});

export default app;
