// The assessor console's API: review submitted vehicles and their photos, verify or reject
// them, and fetch a claim's evidence photos. Claim decisions themselves are on-chain
// transactions the assessor signs with their own wallet; the API never holds that key.
import { Hono } from "hono";
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { parseUnits } from "ethers";
import { z } from "zod";
import { requireAuth, type AuthEnv } from "./auth";
import { decryptBlob } from "./crypto";
import { schema } from "./db";
import { describeVehicle, type PhotoDeps } from "./photos";
import { photoFlags, summaryFlags, type MatchContext, type PhotoFacts } from "./review";
import type { PolicyReader, RoleCheck } from "./roles";

export interface AssessorDeps extends PhotoDeps {
  isAssessor: RoleCheck;
  readPolicy: PolicyReader;
}

const photoFacts = {
  id: schema.photos.id,
  owner: schema.photos.owner,
  purpose: schema.photos.purpose,
  view: schema.photos.view,
  sha256: schema.photos.sha256,
  phash: schema.photos.phash,
  capturedAt: schema.photos.capturedAt,
  gpsLat: schema.photos.gpsLat,
  gpsLon: schema.photos.gpsLon,
  camera: schema.photos.camera,
  evidenceId: schema.photos.evidenceId,
  vehicleSubmissionId: schema.photos.vehicleSubmissionId,
};

const usdc = z
  .union([z.number(), z.string()])
  .transform((value) => String(value))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Use a positive amount with at most 2 decimal places")
  .transform((value) => parseUnits(value, 6));

/// What the assessor confirmed, where it differs from what the owner submitted.
const verifyRequest = z.object({
  year: z.number().int().min(1950).max(2100).optional(),
  marketValueUsdc: usdc.optional(),
  mileageKm: z.number().int().min(0).max(2_000_000).optional(),
  condition: z.number().int().min(1).max(10).optional(),
  accidentsLast3Years: z.number().int().min(0).max(20).optional(),
  usage: z.enum(["private", "commercial"]).optional(),
  note: z.string().trim().max(1_000).optional(),
});

const rejectRequest = z.object({ note: z.string().trim().min(3).max(1_000) });

const isUuid = (value: string) => z.string().uuid().safeParse(value).success;

export function assessorRoutes(deps: AssessorDeps) {
  const { db } = deps;
  const app = new Hono<AuthEnv>();
  app.use("*", requireAuth(deps.sessionSecret, deps.now));
  app.use("*", async (c, next) => {
    if (!(await deps.isAssessor(c.get("address")))) return c.json({ error: "forbidden", reason: "not_an_assessor" }, 403);
    await next();
  });

  async function findVehicle(id: string) {
    if (!isUuid(id)) return undefined;
    const [vehicle] = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, id));
    return vehicle;
  }

  /// Lets the web app show the console only to assessors.
  app.get("/me", (c) => c.json({ address: c.get("address"), assessor: true }));

  /// The review queue, oldest first. `?status=` picks pending (default), verified or rejected;
  /// `?mine=1` lists the caller's own decisions, newest first (their history).
  app.get("/vehicles", async (c) => {
    const status = z.enum(["pending", "verified", "rejected"]).safeParse(c.req.query("status") ?? "pending");
    if (!status.success) return c.json({ error: "invalid_status" }, 400);
    const mine = c.req.query("mine") === "1";
    const rows = await db
      .select()
      .from(schema.vehicles)
      .where(and(eq(schema.vehicles.status, status.data), mine ? eq(schema.vehicles.reviewedBy, c.get("address")) : undefined))
      .orderBy(mine ? desc(schema.vehicles.reviewedAt) : asc(schema.vehicles.createdAt))
      .limit(200);
    return c.json({ vehicles: await Promise.all(rows.map((row) => describeVehicle(db, row))) });
  });

  /// One vehicle, with capture metadata and warning signs for each of its photos.
  app.get("/vehicles/:id", async (c) => {
    const vehicle = await findVehicle(c.req.param("id"));
    if (!vehicle) return c.json({ error: "not_found" }, 404);
    const photos = await db
      .select({ ...photoFacts, createdAt: schema.photos.createdAt })
      .from(schema.photos)
      .where(eq(schema.photos.vehicleSubmissionId, vehicle.id));
    const candidates = await duplicateCandidates(
      or(isNull(schema.photos.vehicleSubmissionId), ne(schema.photos.vehicleSubmissionId, vehicle.id))!,
      photos.map((p) => p.sha256),
    );
    const contexts = await matchContexts(candidates);
    const describeMatch = (match: PhotoFacts): MatchContext => {
      const context = contexts.get(match.id)!;
      return "sameOwner" in context ? { ...context, sameOwner: match.owner === vehicle.owner } : context;
    };
    const checks = Object.fromEntries(
      photos.map((photo) => [
        photo.id,
        {
          capturedAt: photo.capturedAt,
          gps: photo.gpsLat !== null && photo.gpsLon !== null ? { lat: photo.gpsLat, lon: photo.gpsLon } : null,
          camera: photo.camera,
          flags: photoFlags({ photo, uploadedAt: photo.createdAt, candidates, describeMatch }),
        },
      ]),
    );
    return c.json({ ...(await describeVehicle(db, vehicle)), checks });
  });

  app.post("/vehicles/:id/verify", async (c) => {
    const parsed = verifyRequest.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
    const vehicle = await findVehicle(c.req.param("id"));
    if (!vehicle) return c.json({ error: "not_found" }, 404);
    if (vehicle.status !== "pending") return c.json({ error: "not_pending", status: vehicle.status }, 409);

    const described = await describeVehicle(db, vehicle);
    if (described.missingViews.length) {
      return c.json({ error: "missing_photos", missingViews: described.missingViews }, 409);
    }
    // One plate is insured for one owner at a time; a sold car is re-verified for the buyer
    // after the old owner's record is rejected.
    const [otherOwner] = await db
      .select({ id: schema.vehicles.id })
      .from(schema.vehicles)
      .where(
        and(
          eq(schema.vehicles.vehicleId, vehicle.vehicleId),
          eq(schema.vehicles.status, "verified"),
          ne(schema.vehicles.id, vehicle.id),
        ),
      );
    if (otherOwner) return c.json({ error: "verified_for_another_owner", vehicleId: otherOwner.id }, 409);

    const { note, marketValueUsdc, ...corrections } = parsed.data;
    const [updated] = await db
      .update(schema.vehicles)
      .set({
        ...corrections,
        ...(marketValueUsdc !== undefined && { marketValue: marketValueUsdc }),
        status: "verified",
        reviewNote: note ?? null,
        reviewedBy: c.get("address"),
        reviewedAt: deps.now(),
      })
      // Only one assessor can act on a pending vehicle.
      .where(and(eq(schema.vehicles.id, vehicle.id), eq(schema.vehicles.status, "pending")))
      .returning();
    if (!updated) return c.json({ error: "not_pending" }, 409);
    return c.json(await describeVehicle(db, updated));
  });

  app.post("/vehicles/:id/reject", async (c) => {
    const parsed = rejectRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid_request", reason: "Give the owner a reason (3+ characters)" }, 400);
    const vehicle = await findVehicle(c.req.param("id"));
    if (!vehicle) return c.json({ error: "not_found" }, 404);
    if (vehicle.status === "rejected") return c.json({ error: "already_rejected" }, 409);

    // A verified vehicle can be rejected too, e.g. when it has been sold.
    const [updated] = await db
      .update(schema.vehicles)
      .set({ status: "rejected", reviewNote: parsed.data.note, reviewedBy: c.get("address"), reviewedAt: deps.now() })
      .where(eq(schema.vehicles.id, vehicle.id))
      .returning();
    return c.json(await describeVehicle(db, updated));
  });

  /// Any photo, decrypted.
  app.get("/photos/:id", async (c) => {
    const id = c.req.param("id");
    if (!isUuid(id)) return c.json({ error: "not_found" }, 404);
    const [photo] = await db.select().from(schema.photos).where(eq(schema.photos.id, id));
    if (!photo) return c.json({ error: "not_found" }, 404);
    const image = decryptBlob(deps.photoKey, await deps.store.get(photo.storageKey), photo.id);
    return c.body(new Uint8Array(image), 200, { "Content-Type": photo.contentType, "Cache-Control": "private, no-store" });
  });

  /// A claim's evidence, looked up by the evidence URI recorded on-chain.
  app.get("/evidence", async (c) => {
    const uri = c.req.query("uri");
    if (!uri) return c.json({ error: "invalid_request", reason: "Pass ?uri=<evidence URI>" }, 400);
    const [evidence] = await db.select().from(schema.claimEvidence).where(eq(schema.claimEvidence.uri, uri));
    if (!evidence) return c.json({ error: "not_found" }, 404);
    const photos = await db
      .select({
        id: schema.photos.id,
        cid: schema.photos.cid,
        sha256: schema.photos.sha256,
        contentType: schema.photos.contentType,
        size: schema.photos.size,
      })
      .from(schema.photos)
      .where(eq(schema.photos.evidenceId, evidence.id))
      .orderBy(asc(schema.photos.createdAt));
    return c.json({ ...evidence, policyId: evidence.policyId.toString(), photos });
  });

  /// Everything needed to judge a claim, by its on-chain evidence URI: the description, the
  /// claimant's contact details, the covered car with its verification photos, and each claim
  /// photo with its capture metadata and warning signs.
  app.get("/claims/review", async (c) => {
    const uri = c.req.query("uri");
    if (!uri) return c.json({ error: "invalid_request", reason: "Pass ?uri=<evidence URI>" }, 400);
    const [evidence] = await db.select().from(schema.claimEvidence).where(eq(schema.claimEvidence.uri, uri));
    if (!evidence) return c.json({ error: "not_found" }, 404);

    const [photos, [claimant], policy] = await Promise.all([
      db.select(photoFacts).from(schema.photos).where(eq(schema.photos.evidenceId, evidence.id)).orderBy(asc(schema.photos.createdAt)),
      db.select().from(schema.profiles).where(eq(schema.profiles.address, evidence.owner)),
      deps.readPolicy(evidence.policyId).catch(() => null),
    ]);

    // The covered car: the verified record for the policy's vehicle id, else the latest one.
    const [vehicle] = policy
      ? await db
          .select()
          .from(schema.vehicles)
          .where(sql`lower(${schema.vehicles.vehicleId}) = ${policy.vehicleId.toLowerCase()}`)
          .orderBy(sql`${schema.vehicles.status} = 'verified' desc`, desc(schema.vehicles.createdAt))
          .limit(1)
      : [];

    const candidates = await duplicateCandidates(
      or(isNull(schema.photos.evidenceId), ne(schema.photos.evidenceId, evidence.id))!,
      photos.map((p) => p.sha256),
    );
    const contexts = await matchContexts(candidates, vehicle?.id);
    const describeMatch = (match: PhotoFacts): MatchContext => {
      const context = contexts.get(match.id)!;
      return "sameOwner" in context ? { ...context, sameOwner: match.owner === evidence.owner } : context;
    };

    return c.json({
      evidence: {
        uri: evidence.uri,
        policyId: evidence.policyId.toString(),
        owner: evidence.owner,
        description: evidence.description,
        createdAt: evidence.createdAt,
      },
      claimant: claimant ? { fullName: claimant.fullName, email: claimant.email, phone: claimant.phone } : null,
      policy: policy ? { vehicleId: policy.vehicleId, startTime: policy.startTime } : null,
      vehicle: vehicle ? await describeVehicle(db, vehicle) : null,
      photos: photos.map((photo) => ({
        id: photo.id,
        view: photo.view,
        capturedAt: photo.capturedAt,
        gps: photo.gpsLat !== null && photo.gpsLon !== null ? { lat: photo.gpsLat, lon: photo.gpsLon } : null,
        camera: photo.camera,
        flags: photoFlags({ photo, uploadedAt: evidence.createdAt, policyStart: policy?.startTime, candidates, describeMatch }),
      })),
      flags: summaryFlags(photos),
    });
  });

  /// Stored photos that could match the ones under review: any with a fingerprint, or with one
  /// of the given hashes. A linear scan is fine at this scale; past ~100k photos, move
  /// fingerprints to an index (e.g. a BK-tree or pgvector).
  function duplicateCandidates(outside: SQL, hashes: string[]) {
    return db
      .select(photoFacts)
      .from(schema.photos)
      .where(and(outside, or(isNotNull(schema.photos.phash), inArray(schema.photos.sha256, hashes.concat("")))));
  }

  /// Where each candidate photo came from: this car's verification set, another vehicle, or
  /// another claim. `sameOwner` is filled in per claim by the caller.
  async function matchContexts(candidates: PhotoFacts[], coveredVehicleId?: string) {
    const vehicleIds = [...new Set(candidates.map((p) => p.vehicleSubmissionId).filter((id): id is string => Boolean(id)))];
    const evidenceIds = [...new Set(candidates.map((p) => p.evidenceId).filter((id): id is string => Boolean(id)))];
    const [plates, policies] = await Promise.all([
      vehicleIds.length
        ? db.select({ id: schema.vehicles.id, plate: schema.vehicles.plate }).from(schema.vehicles).where(inArray(schema.vehicles.id, vehicleIds))
        : [],
      evidenceIds.length
        ? db
            .select({ id: schema.claimEvidence.id, policyId: schema.claimEvidence.policyId })
            .from(schema.claimEvidence)
            .where(inArray(schema.claimEvidence.id, evidenceIds))
        : [],
    ]);
    const plateOf = new Map(plates.map((row) => [row.id, row.plate]));
    const policyOf = new Map(policies.map((row) => [row.id, row.policyId.toString()]));
    return new Map(
      candidates.map((photo): [string, MatchContext] => [
        photo.id,
        photo.vehicleSubmissionId === coveredVehicleId && coveredVehicleId
          ? { kind: "this-car-verification", view: photo.view }
          : photo.vehicleSubmissionId
            ? { kind: "other-vehicle", plate: plateOf.get(photo.vehicleSubmissionId) ?? "unknown", sameOwner: false }
            : { kind: "other-claim", policyId: policyOf.get(photo.evidenceId!) ?? "unknown", sameOwner: false },
      ]),
    );
  }

  return app;
}
