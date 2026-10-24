// Vehicle submissions, their photos, and claim evidence. Every photo is encrypted before it
// leaves the server (see crypto.ts); storage only ever holds ciphertext.
import { createHash, randomUUID } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { and, asc, eq } from "drizzle-orm";
import { formatUnits, parseUnits } from "ethers";
import { z } from "zod";
import { vehicleIdFor } from "@vehicle-shield/protocol";
import { customersOnly, requireAuth, type AuthEnv } from "./auth";
import { decryptBlob, encryptBlob } from "./crypto";
import { schema, type Database } from "./db";
import { inspectImage, type CaptureMetadata } from "./forensics";
import type { BlobStore } from "./storage";

export const PHOTO_VIEWS = ["front", "back", "left", "right", "interior", "odometer"] as const;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_EVIDENCE_PHOTOS = 10;
/// Claim photo roles: at least one "overview" shows the whole car with its plate readable.
export const EVIDENCE_VIEWS = ["overview", "damage"] as const;

export interface PhotoDeps {
  /// Whether an address is staff (an assessor); staff can't submit vehicles or claim evidence.
  isStaff?: (address: `0x${string}`) => Promise<boolean>;
  db: Database;
  store: BlobStore;
  photoKey: Buffer;
  vehicleIdSalt: string;
  sessionSecret: string;
  now: () => Date;
}

/// Identifies JPEG, PNG, WebP and HEIC/HEIF by their leading bytes; the declared type is ignored.
export function detectImageType(bytes: Uint8Array): string | null {
  const b = Buffer.from(bytes.subarray(0, 16));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.toString("ascii", 4, 8) === "ftyp" && ["heic", "heix", "mif1", "msf1"].includes(b.toString("ascii", 8, 12))) {
    return "image/heic";
  }
  return null;
}

type PhotoRow = typeof schema.photos.$inferInsert;

async function readImage(file: unknown): Promise<{ bytes: Uint8Array; contentType: string } | { error: string }> {
  if (!(file instanceof File)) return { error: "Attach the photo as a file" };
  if (file.size === 0) return { error: "The file is empty" };
  if (file.size > MAX_PHOTO_BYTES) return { error: "Photos must be 10 MB or smaller" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectImageType(bytes);
  if (!contentType) return { error: "Only JPEG, PNG, WebP and HEIC photos are accepted" };
  return { bytes, contentType };
}

/// Capture metadata the web app read from the original file before resizing it (optional).
const reportedMetadata = z
  .object({
    capturedAt: z.string().datetime({ offset: true }).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
    camera: z.string().trim().max(80).optional(),
  })
  .transform(({ capturedAt, ...rest }): CaptureMetadata => ({ ...rest, capturedAt: capturedAt ? new Date(capturedAt) : undefined }));

/// Parses a `meta` form field; anything malformed is ignored rather than failing the upload.
export function parseReportedMetadata(value: unknown): CaptureMetadata | undefined {
  if (typeof value !== "string" || value.length > 2_000) return undefined;
  try {
    const parsed = reportedMetadata.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/// Inspects, encrypts and stores one photo; returns the row to insert once the caller's records exist.
async function uploadPhoto(
  deps: PhotoDeps,
  image: { bytes: Uint8Array; contentType: string },
  row: Pick<PhotoRow, "owner" | "purpose" | "view" | "vehicleSubmissionId" | "evidenceId">,
  reported?: CaptureMetadata,
): Promise<PhotoRow> {
  const id = randomUUID();
  const inspection = await inspectImage(image.bytes, image.contentType, reported);
  const bytes = inspection.bytes;
  const stored = await deps.store.put(`photos/${id}`, encryptBlob(deps.photoKey, bytes, id), "application/octet-stream");
  return {
    ...row,
    id,
    storageKey: stored.key,
    cid: stored.cid,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    contentType: image.contentType,
    size: bytes.length,
    phash: inspection.phash,
    capturedAt: inspection.metadata.capturedAt ?? null,
    gpsLat: inspection.metadata.lat ?? null,
    gpsLon: inspection.metadata.lon ?? null,
    camera: inspection.metadata.camera ?? null,
    metadataSource: inspection.metadataSource,
  };
}

const usdc = z
  .union([z.number(), z.string()])
  .transform((value) => String(value))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Use a positive amount with at most 2 decimal places")
  .transform((value) => parseUnits(value, 6));

const vehicleRequest = z.object({
  plate: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 -]{2,15}$/, "Use 2 to 15 letters, digits, spaces or hyphens"),
  make: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(40),
  year: z.number().int().min(1950).max(2100),
  marketValueUsdc: usdc,
  mileageKm: z.number().int().min(0).max(2_000_000),
  condition: z.number().int().min(1).max(10),
  accidentsLast3Years: z.number().int().min(0).max(20),
  usage: z.enum(["private", "commercial"]),
});

const tooLarge = bodyLimit({
  maxSize: MAX_PHOTO_BYTES + 64 * 1024,
  onError: (c) => c.json({ error: "too_large", reason: "Photos must be 10 MB or smaller" }, 413),
});

/// A vehicle as the API returns it: details, its photos, and the views still missing.
export async function describeVehicle(db: Database, vehicle: typeof schema.vehicles.$inferSelect) {
  const photos = await db
    .select({ id: schema.photos.id, view: schema.photos.view, createdAt: schema.photos.createdAt })
    .from(schema.photos)
    .where(eq(schema.photos.vehicleSubmissionId, vehicle.id))
    .orderBy(asc(schema.photos.createdAt));
  const uploaded = new Set(photos.map((photo) => photo.view));
  const { marketValue, ...rest } = vehicle;
  return {
    ...rest,
    marketValueUsdc: formatUnits(marketValue, 6),
    photos,
    missingViews: PHOTO_VIEWS.filter((view) => !uploaded.has(view)),
  };
}

export function vehicleRoutes(deps: PhotoDeps) {
  const { db } = deps;
  const app = new Hono<AuthEnv>();
  app.use("*", requireAuth(deps.sessionSecret, deps.now));
  const staffCheck = customersOnly(deps.isStaff ?? (async () => false));
  const describe = (vehicle: typeof schema.vehicles.$inferSelect) => describeVehicle(db, vehicle);

  async function ownVehicle(id: string, owner: string) {
    if (!z.string().uuid().safeParse(id).success) return undefined;
    const [vehicle] = await db
      .select()
      .from(schema.vehicles)
      .where(and(eq(schema.vehicles.id, id), eq(schema.vehicles.owner, owner)));
    return vehicle;
  }

  /// Submit a vehicle for verification (or update a pending or rejected submission).
  app.post("/", staffCheck, async (c) => {
    const parsed = vehicleRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
    const { plate, marketValueUsdc, ...details } = parsed.data;
    const owner = c.get("address");
    const vehicleId = vehicleIdFor(plate, deps.vehicleIdSalt);
    const fields = { ...details, plate: plate.replace(/\s+/g, "").toUpperCase(), marketValue: marketValueUsdc };

    const [existing] = await db
      .select()
      .from(schema.vehicles)
      .where(and(eq(schema.vehicles.owner, owner), eq(schema.vehicles.vehicleId, vehicleId)));
    if (existing?.status === "verified") {
      return c.json({ error: "already_verified", vehicle: await describe(existing) }, 409);
    }

    const [vehicle] = existing
      ? await db
          .update(schema.vehicles)
          .set({ ...fields, status: "pending", reviewNote: null, reviewedBy: null, reviewedAt: null })
          .where(eq(schema.vehicles.id, existing.id))
          .returning()
      : await db.insert(schema.vehicles).values({ ...fields, owner, vehicleId }).returning();
    return c.json(await describe(vehicle), existing ? 200 : 201);
  });

  app.get("/", async (c) => {
    const rows = await db
      .select()
      .from(schema.vehicles)
      .where(eq(schema.vehicles.owner, c.get("address")))
      .orderBy(asc(schema.vehicles.createdAt));
    return c.json({ vehicles: await Promise.all(rows.map(describe)) });
  });

  /// Upload one of the required views (multipart: `view`, `file`). Replaces an earlier upload.
  app.post("/:id/photos", staffCheck, tooLarge, async (c) => {
    const owner = c.get("address");
    const vehicle = await ownVehicle(c.req.param("id"), owner);
    if (!vehicle) return c.json({ error: "not_found" }, 404);
    if (vehicle.status !== "pending") {
      return c.json({ error: "not_editable", reason: `This vehicle is ${vehicle.status}` }, 409);
    }

    const body = await c.req.parseBody();
    const view = z.enum(PHOTO_VIEWS).safeParse(body.view);
    if (!view.success) return c.json({ error: "invalid_view", views: PHOTO_VIEWS }, 400);
    const image = await readImage(body.file);
    if ("error" in image) return c.json({ error: "invalid_file", reason: image.error }, 400);

    const row = await uploadPhoto(
      deps,
      image,
      { owner, purpose: "vehicle", view: view.data, vehicleSubmissionId: vehicle.id },
      parseReportedMetadata(body.meta),
    );
    await db.transaction(async (tx) => {
      await tx
        .delete(schema.photos)
        .where(and(eq(schema.photos.vehicleSubmissionId, vehicle.id), eq(schema.photos.view, view.data)));
      await tx.insert(schema.photos).values(row);
    });
    return c.json({ photoId: row.id, view: view.data, cid: row.cid, vehicle: await describe(vehicle) }, 201);
  });

  return app;
}

export function evidenceRoutes(deps: PhotoDeps) {
  const app = new Hono<AuthEnv>();
  app.use("*", requireAuth(deps.sessionSecret, deps.now));

  /// Upload a claim's photos (multipart: `policyId`, `description`, one or more `files`, and per
  /// file a `views` entry, "overview" or "damage", plus an optional `meta` JSON entry). At least
  /// one overview is required. Returns the evidence URI to pass to InsuranceCore.submitClaim.
  app.post(
    "/",
    customersOnly(deps.isStaff ?? (async () => false)),
    bodyLimit({
      maxSize: MAX_EVIDENCE_PHOTOS * MAX_PHOTO_BYTES + 64 * 1024,
      onError: (c) => c.json({ error: "too_large", reason: "Up to 10 photos of 10 MB each" }, 413),
    }),
    async (c) => {
      const owner = c.get("address");
      const body = await c.req.parseBody({ all: true });
      const policyId = z.string().regex(/^\d{1,30}$/).safeParse(body.policyId);
      if (!policyId.success) return c.json({ error: "invalid_policy_id" }, 400);
      const description = z.string().trim().max(1_000).optional().safeParse(body.description ?? undefined);
      if (!description.success) return c.json({ error: "invalid_description", reason: "Keep the description under 1,000 characters" }, 400);
      const files = ([] as unknown[]).concat(body.files ?? []);
      if (files.length === 0 || files.length > MAX_EVIDENCE_PHOTOS) {
        return c.json({ error: "invalid_files", reason: `Attach 1 to ${MAX_EVIDENCE_PHOTOS} photos` }, 400);
      }

      const views = z.array(z.enum(EVIDENCE_VIEWS)).length(files.length).safeParse(([] as unknown[]).concat(body.views ?? []));
      if (!views.success) {
        return c.json({ error: "invalid_views", reason: `Give each photo a view: ${EVIDENCE_VIEWS.join(" or ")}` }, 400);
      }
      if (!views.data.includes("overview")) {
        return c.json({ error: "overview_required", reason: "Add one photo of the whole car with the number plate readable" }, 400);
      }
      const meta = ([] as unknown[]).concat(body.meta ?? []);

      const images: { bytes: Uint8Array; contentType: string }[] = [];
      for (const [index, file] of files.entries()) {
        const image = await readImage(file);
        if ("error" in image) return c.json({ error: "invalid_file", file: index, reason: image.error }, 400);
        images.push(image);
      }

      const evidenceId = randomUUID();
      const rows: PhotoRow[] = [];
      for (const [index, image] of images.entries()) {
        rows.push(
          await uploadPhoto(
            deps,
            image,
            { owner, purpose: "claim", view: views.data[index], evidenceId },
            meta.length === files.length ? parseReportedMetadata(meta[index]) : undefined,
          ),
        );
      }
      // The manifest holds no images or personal data, so it is stored unencrypted.
      const manifest = {
        version: 1,
        policyId: policyId.data,
        createdAt: deps.now().toISOString(),
        photos: rows.map(({ cid, sha256, contentType, size, view }) => ({ cid, sha256, contentType, size, view })),
      };
      const stored = await deps.store.put(
        `evidence/${evidenceId}.json`,
        Buffer.from(JSON.stringify(manifest, null, 2)),
        "application/json",
      );

      await deps.db.transaction(async (tx) => {
        await tx.insert(schema.claimEvidence).values({
          id: evidenceId,
          owner,
          policyId: BigInt(policyId.data),
          manifestCid: stored.cid,
          uri: stored.uri,
          description: description.data || null,
          createdAt: deps.now(),
        });
        await tx.insert(schema.photos).values(rows);
      });
      return c.json({ evidenceId, evidenceUri: stored.uri, photos: rows.map(({ id, cid }) => ({ id, cid })) }, 201);
    },
  );

  /// The caller's own evidence for a claim, by the evidence URI recorded on-chain.
  app.get("/", async (c) => {
    const uri = c.req.query("uri");
    if (!uri) return c.json({ error: "invalid_request", reason: "Pass ?uri=<evidence URI>" }, 400);
    const [evidence] = await deps.db
      .select()
      .from(schema.claimEvidence)
      .where(and(eq(schema.claimEvidence.uri, uri), eq(schema.claimEvidence.owner, c.get("address"))));
    if (!evidence) return c.json({ error: "not_found" }, 404);
    const photos = await deps.db
      .select({ id: schema.photos.id, view: schema.photos.view, contentType: schema.photos.contentType })
      .from(schema.photos)
      .where(eq(schema.photos.evidenceId, evidence.id))
      .orderBy(asc(schema.photos.createdAt));
    return c.json({ uri: evidence.uri, policyId: evidence.policyId.toString(), description: evidence.description, photos });
  });

  return app;
}

export function photoRoutes(deps: PhotoDeps) {
  const app = new Hono<AuthEnv>();
  app.use("*", requireAuth(deps.sessionSecret, deps.now));

  /// The decrypted photo, for its owner only. (Assessor access comes with the console.)
  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    if (!z.string().uuid().safeParse(id).success) return c.json({ error: "not_found" }, 404);
    const [photo] = await deps.db
      .select()
      .from(schema.photos)
      .where(and(eq(schema.photos.id, id), eq(schema.photos.owner, c.get("address"))));
    if (!photo) return c.json({ error: "not_found" }, 404);

    const image = decryptBlob(deps.photoKey, await deps.store.get(photo.storageKey), photo.id);
    return c.body(new Uint8Array(image), 200, {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, no-store",
    });
  });

  return app;
}
