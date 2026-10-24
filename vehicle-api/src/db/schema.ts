import { bigint, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("claim_evidence_uri_idx").on(t.uri)],
);

/// An encrypted photo in storage. `sha256` is of the original image, for integrity checks.
export const photos = pgTable(
  "photo",
  {
    id: uuid("id").primaryKey(), // generated before upload: it is bound into the encryption
    owner: text("owner").notNull(),
    purpose: photoPurpose("purpose").notNull(),
    vehicleSubmissionId: uuid("vehicle_submission_id").references(() => vehicles.id),
    evidenceId: uuid("evidence_id").references(() => claimEvidence.id),
    view: text("view"),
    storageKey: text("storage_key").notNull(),
    cid: text("cid").notNull(),
    sha256: text("sha256").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("photo_vehicle_idx").on(t.vehicleSubmissionId), index("photo_evidence_idx").on(t.evidenceId)],
);
