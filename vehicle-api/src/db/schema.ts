import { bigint, boolean, doublePrecision, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/// Single-use Sign-In with Ethereum nonces. A nonce is deleted when it is used.
export const authNonces = pgTable("auth_nonce", {
  nonce: text("nonce").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const vehicleStatus = pgEnum("vehicle_status", ["pending", "verified", "rejected"]);
export const photoPurpose = pgEnum("photo_purpose", ["vehicle", "claim"]);

/// A vehicle an owner wants insured. Quotes are only signed once an assessor has verified it,
/// and then priced from these (assessor-confirmed) details. Plates never go on-chain.
export const vehicles = pgTable(
  "vehicle",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    owner: text("owner").notNull(), // checksummed address
    plate: text("plate").notNull(), // normalized: no spaces, upper case
    vehicleId: text("vehicle_id").notNull(), // salted hash used on-chain
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    marketValue: bigint("market_value", { mode: "bigint" }).notNull(), // USDC base units
    mileageKm: integer("mileage_km").notNull(),
    condition: integer("condition").notNull(),
    accidentsLast3Years: integer("accidents_last_3_years").notNull(),
    usage: text("usage", { enum: ["private", "commercial"] }).notNull(),
    status: vehicleStatus("status").notNull().default("pending"),
    reviewNote: text("review_note"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("vehicle_owner_vehicle_id").on(t.owner, t.vehicleId), index("vehicle_status_idx").on(t.status)],
);

/// The photos behind one claim. Its manifest (CIDs and hashes only, no images or personal
/// data) is what the claim's on-chain evidence URI points to.
export const claimEvidence = pgTable(
  "claim_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    owner: text("owner").notNull(),
    policyId: bigint("policy_id", { mode: "bigint" }).notNull(),
    manifestCid: text("manifest_cid").notNull(),
    uri: text("uri").notNull(),
    // What happened, for the assessor. Private: never in the public manifest or on-chain.
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("claim_evidence_uri_idx").on(t.uri)],
);

/// An encrypted photo in storage. `sha256` is of the stored image (EXIF removed), for integrity
/// checks and exact-duplicate detection; `phash` is a perceptual fingerprint (see forensics.ts).
export const photos = pgTable(
  "photo",
  {
    id: uuid("id").primaryKey(), // generated before upload: it is bound into the encryption
    owner: text("owner").notNull(),
    purpose: photoPurpose("purpose").notNull(),
    vehicleSubmissionId: uuid("vehicle_submission_id").references(() => vehicles.id),
    evidenceId: uuid("evidence_id").references(() => claimEvidence.id),
    view: text("view"), // vehicle: front, back, ...; claim: overview (whole car, plate visible) or damage
    storageKey: text("storage_key").notNull(),
    cid: text("cid").notNull(),
    sha256: text("sha256").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    phash: text("phash"),
    // When, where and with what the photo was taken, if known; `metadataSource` says whether it
    // came from the file itself or was reported by the uploading device.
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    gpsLat: doublePrecision("gps_lat"),
    gpsLon: doublePrecision("gps_lon"),
    camera: text("camera"),
    metadataSource: text("metadata_source", { enum: ["file", "device"] }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("photo_vehicle_idx").on(t.vehicleSubmissionId),
    index("photo_evidence_idx").on(t.evidenceId),
    index("photo_sha256_idx").on(t.sha256),
  ],
);

/// Contact details collected after a wallet's first sign-in (registration). Needed to reach
/// policyholders about claims and renewals; never stored on-chain.
export const profiles = pgTable("profile", {
  address: text("address").primaryKey(), // checksummed
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  // Which channels may carry notifications, besides the in-app list (always on).
  notifyEmail: boolean("notify_email").notNull().default(true),
  notifySms: boolean("notify_sms").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/// One message to one wallet: shown in the app, and sent by email or SMS per the recipient's
/// profile. `key` makes each event notify once, however often the worker sees it.
export const notifications = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipient: text("recipient").notNull(), // checksummed address
    key: text("key").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"), // app path, e.g. /dashboard/claims/3
    email: text("email", { enum: ["sent", "failed", "skipped"] }),
    sms: text("sms", { enum: ["sent", "failed", "skipped"] }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("notification_recipient_key").on(t.recipient, t.key), index("notification_recipient_idx").on(t.recipient, t.createdAt)],
);

/// Small persistent values for background jobs, e.g. how far the notification worker has read.
export const jobState = pgTable("job_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
