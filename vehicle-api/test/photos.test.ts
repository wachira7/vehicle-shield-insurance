import { createHash, randomBytes } from "node:crypto";
import { Wallet } from "ethers";
import { eq } from "drizzle-orm";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deployments, priceQuote, vehicleIdFor } from "@vehicle-shield/protocol";
import { createApp } from "../src/app";
import { decryptBlob } from "../src/crypto";
import { openDatabase, schema, type Database } from "../src/db";
import { MAX_PHOTO_BYTES, PHOTO_VIEWS } from "../src/photos";
import { memoryStore } from "../src/storage";
import { databaseVerifier } from "../src/verification";

const SECRET = "test-session-secret-test-session-secret";
const PHOTO_KEY = randomBytes(32);
const SALT = "test-salt";
const NOW = new Date("2026-06-01T00:00:00Z");

let db: Database;
let closeDb: () => Promise<void>;
const store = memoryStore();

beforeAll(async () => {
  ({ db, close: closeDb } = await openDatabase("pglite:"));
});
afterAll(() => closeDb());

const app = () =>
  createApp({
    signer: Wallet.createRandom(),
    deployment: deployments.sepolia,
    vehicleIdSalt: SALT,
    verifier: databaseVerifier(db),
    db,
    sessionSecret: SECRET,
    siweDomain: "localhost:3000",
    store,
    photoKey: PHOTO_KEY,
    isAssessor: async () => false,
    now: () => NOW,
  });

async function signIn(account: PrivateKeyAccount) {
  const { nonce } = await (await app().request("/v1/auth/nonce")).json();
  const message = createSiweMessage({
    address: account.address,
    chainId: deployments.sepolia.chainId,
    domain: "localhost:3000",
    nonce,
    uri: "http://localhost:3000",
    version: "1",
    issuedAt: NOW,
  });
  const res = await app().request("/v1/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature: await account.signMessage({ message }) }),
  });
  return { Authorization: `Bearer ${(await res.json()).token}` };
}

const jpeg = (size = 2_000) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(size)]);
const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), randomBytes(500)]);

const vehicleBody = {
  plate: "KDA 123A",
  make: "Toyota",
  model: "Axio",
  year: 2018,
  marketValueUsdc: 9_000,
  mileageKm: 120_000,
  condition: 6,
  accidentsLast3Years: 1,
  usage: "private",
};

const owner = privateKeyToAccount(generatePrivateKey());
const stranger = privateKeyToAccount(generatePrivateKey());
let auth: Record<string, string>;
let strangerAuth: Record<string, string>;

beforeAll(async () => {
  auth = await signIn(owner);
  strangerAuth = await signIn(stranger);
});

const postJson = (path: string, body: unknown, headers = auth) =>
  app().request(path, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });

function uploadView(vehicleId: string, view: string, bytes: Uint8Array, headers = auth) {
  const form = new FormData();
  form.set("view", view);
  form.set("file", new File([new Uint8Array(bytes)], "photo.jpg", { type: "image/jpeg" }));
  return app().request(`/v1/vehicles/${vehicleId}/photos`, { method: "POST", headers, body: form });
}

async function submitVehicle(body = vehicleBody) {
  const res = await postJson("/v1/vehicles", body);
  expect([200, 201]).toContain(res.status);
  return res.json();
}

describe("vehicle submissions", () => {
  it("need a signed-in wallet", async () => {
    const res = await app().request("/v1/vehicles", { method: "POST", body: JSON.stringify(vehicleBody) });
    expect(res.status).toBe(401);
  });

  it("start pending, with every photo view still missing", async () => {
    const vehicle = await submitVehicle();
    expect(vehicle).toMatchObject({
      owner: owner.address,
      plate: "KDA123A",
      vehicleId: vehicleIdFor("KDA 123A", SALT),
      status: "pending",
      marketValueUsdc: "9000.0",
      missingViews: [...PHOTO_VIEWS],
    });
  });

  it("update the same submission when sent again", async () => {
    const first = await submitVehicle();
    const again = await submitVehicle({ ...vehicleBody, plate: "kda123a", mileageKm: 121_000 });
    expect(again.id).toBe(first.id);
    expect(again.mileageKm).toBe(121_000);
  });

  it("validate their fields", async () => {
    expect((await postJson("/v1/vehicles", { ...vehicleBody, condition: 11 })).status).toBe(400);
    expect((await postJson("/v1/vehicles", { ...vehicleBody, plate: "<script>" })).status).toBe(400);
  });

  it("are listed only for their owner", async () => {
    await submitVehicle();
    const mine = await (await app().request("/v1/vehicles", { headers: auth })).json();
    const theirs = await (await app().request("/v1/vehicles", { headers: strangerAuth })).json();
    expect(mine.vehicles.length).toBeGreaterThan(0);
    expect(theirs.vehicles).toEqual([]);
  });
});

describe("vehicle photos", () => {
  it("are stored encrypted, bound to their record, and served back decrypted to the owner", async () => {
    const vehicle = await submitVehicle();
    const image = jpeg();
    const res = await uploadView(vehicle.id, "front", image);
    expect(res.status).toBe(201);
    const { photoId, vehicle: updated } = await res.json();
    expect(updated.missingViews).not.toContain("front");

    const [row] = await db.select().from(schema.photos).where(eq(schema.photos.id, photoId));
    expect(row).toMatchObject({ contentType: "image/jpeg", size: image.length, view: "front" });
    expect(row.sha256).toBe(createHash("sha256").update(image).digest("hex"));

    const stored = Buffer.from(store.objects.get(row.storageKey)!);
    expect(stored.includes(image.subarray(0, 64))).toBe(false);
    expect(decryptBlob(PHOTO_KEY, stored, photoId).equals(image)).toBe(true);

    const download = await app().request(`/v1/photos/${photoId}`, { headers: auth });
    expect(download.status).toBe(200);
    expect(download.headers.get("content-type")).toBe("image/jpeg");
    expect(download.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await download.arrayBuffer()).equals(image)).toBe(true);
  });

  it("replace an earlier upload of the same view", async () => {
    const vehicle = await submitVehicle();
    await uploadView(vehicle.id, "back", jpeg());
    await uploadView(vehicle.id, "back", png());
    const rows = await db.select().from(schema.photos).where(eq(schema.photos.vehicleSubmissionId, vehicle.id));
    expect(rows.filter((row) => row.view === "back").map((row) => row.contentType)).toEqual(["image/png"]);
  });

  it("must be real images of an allowed size and view", async () => {
    const vehicle = await submitVehicle();
    const notImage = await uploadView(vehicle.id, "left", Buffer.from("definitely not a photo"));
    expect(notImage.status).toBe(400);
    expect((await notImage.json()).reason).toMatch(/JPEG, PNG, WebP and HEIC/);
    expect((await uploadView(vehicle.id, "left", Buffer.alloc(0))).status).toBe(400);
    expect((await uploadView(vehicle.id, "roof", jpeg())).status).toBe(400);
    const justOver = await uploadView(vehicle.id, "left", jpeg(MAX_PHOTO_BYTES + 1_000));
    expect(justOver.status).toBe(400);
    expect((await justOver.json()).reason).toMatch(/10 MB or smaller/);
    // Far larger requests are cut off before the body is read.
    expect((await uploadView(vehicle.id, "left", jpeg(MAX_PHOTO_BYTES + 200_000))).status).toBe(413);
  });

  it("can't be uploaded to or viewed by another wallet", async () => {
    const vehicle = await submitVehicle();
    expect((await uploadView(vehicle.id, "right", jpeg(), strangerAuth)).status).toBe(404);
    const { photoId } = await (await uploadView(vehicle.id, "right", jpeg())).json();
    expect((await app().request(`/v1/photos/${photoId}`, { headers: strangerAuth })).status).toBe(404);
    expect((await app().request(`/v1/photos/not-a-uuid`, { headers: auth })).status).toBe(404);
  });
});

describe("verified vehicles", () => {
  const plate = "KDC 777C";
  const quoteBody = {
    buyer: owner.address,
    plate,
    // What a buyer might claim to get a cheaper premium: newer, pristine, no accidents.
    vehicle: { year: 2025, marketValueUsdc: 20_000, mileageKm: 1_000, condition: 10, accidentsLast3Years: 0, usage: "private" },
    coverageUsdc: 8_000,
    deductibleUsdc: 400,
    durationDays: 365,
  };

  it("get no signed quote until an assessor verifies them", async () => {
    await submitVehicle({ ...vehicleBody, plate });
    const res = await postJson("/v1/quotes", quoteBody);
    expect(res.status).toBe(403);
  });

  it("are priced from their verified details, not the request's", async () => {
    const vehicle = await submitVehicle({ ...vehicleBody, plate });
    await db.update(schema.vehicles).set({ status: "verified" }).where(eq(schema.vehicles.id, vehicle.id));

    const res = await postJson("/v1/quotes", quoteBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pricedFrom).toBe("verified_vehicle");

    const expected = priceQuote(
      { year: 2018, marketValue: 9_000_000_000n, mileageKm: 120_000, condition: 6, accidentsLast3Years: 1, usage: "private" },
      { coverage: 8_000_000_000n, deductible: 400_000_000n, durationDays: 365 },
      NOW,
    );
    if (!expected.eligible) throw new Error("expected eligible");
    expect(body.quote.premium).toBe(expected.premium.toString());
  });

  it("are locked against changes and new photos", async () => {
    const vehicle = await submitVehicle({ ...vehicleBody, plate: "KDD 888D" });
    await db.update(schema.vehicles).set({ status: "verified" }).where(eq(schema.vehicles.id, vehicle.id));
    expect((await postJson("/v1/vehicles", { ...vehicleBody, plate: "KDD 888D" })).status).toBe(409);
    expect((await uploadView(vehicle.id, "front", jpeg())).status).toBe(409);
  });

  it("can be resubmitted after a rejection", async () => {
    const vehicle = await submitVehicle({ ...vehicleBody, plate: "KDE 999E" });
    await db
      .update(schema.vehicles)
      .set({ status: "rejected", reviewNote: "Photos are blurry" })
      .where(eq(schema.vehicles.id, vehicle.id));
    const again = await submitVehicle({ ...vehicleBody, plate: "KDE 999E" });
    expect(again).toMatchObject({ id: vehicle.id, status: "pending", reviewNote: null });
  });
});

describe("claim evidence", () => {
  function uploadEvidence(
    files: Uint8Array[],
    policyId = "1",
    headers = auth,
    description?: string,
    views: string[] = files.map((_, i) => (i === 0 ? "overview" : "damage")),
  ) {
    const form = new FormData();
    form.set("policyId", policyId);
    if (description !== undefined) form.set("description", description);
    for (const file of files) form.append("files", new File([new Uint8Array(file)], "damage.jpg", { type: "image/jpeg" }));
    for (const view of views) form.append("views", view);
    return app().request("/v1/claims/evidence", { method: "POST", headers, body: form });
  }

  it("stores encrypted photos and a manifest that the evidence URI points to", async () => {
    const images = [jpeg(), png()];
    const res = await uploadEvidence(images, "42");
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.evidenceUri).toMatch(/^local:\/\/local-[0-9a-f]{64}$/);
    expect(body.photos).toHaveLength(2);

    const manifest = JSON.parse(Buffer.from(store.objects.get(`evidence/${body.evidenceId}.json`)!).toString());
    expect(manifest).toMatchObject({ version: 1, policyId: "42" });
    expect(manifest.photos.map((p: { sha256: string }) => p.sha256)).toEqual(
      images.map((image) => createHash("sha256").update(image).digest("hex")),
    );
    expect(JSON.stringify(manifest)).not.toContain(owner.address);

    const [evidence] = await db.select().from(schema.claimEvidence).where(eq(schema.claimEvidence.id, body.evidenceId));
    expect(evidence).toMatchObject({ owner: owner.address, policyId: 42n, uri: body.evidenceUri });
  });

  it("needs a policy id and 1 to 10 valid photos", async () => {
    expect((await uploadEvidence([], "1")).status).toBe(400);
    expect((await uploadEvidence([jpeg()], "abc")).status).toBe(400);
    expect((await uploadEvidence(Array.from({ length: 11 }, () => jpeg(100)), "1")).status).toBe(400);
    const bad = await uploadEvidence([jpeg(), Buffer.from("not a photo")], "1");
    expect(bad.status).toBe(400);
    expect((await bad.json()).file).toBe(1);
  });

  it("needs a signed-in wallet", async () => {
    expect((await uploadEvidence([jpeg()], "1", {})).status).toBe(401);
  });

  it("needs a view for every photo and at least one overview of the whole car", async () => {
    const noOverview = await uploadEvidence([jpeg(), jpeg()], "1", auth, undefined, ["damage", "damage"]);
    expect(noOverview.status).toBe(400);
    expect((await noOverview.json()).error).toBe("overview_required");
    expect((await uploadEvidence([jpeg(), jpeg()], "1", auth, undefined, ["overview"])).status).toBe(400);
    expect((await uploadEvidence([jpeg()], "1", auth, undefined, ["sideways"])).status).toBe(400);
  });

  it("keeps the description private and lets only the owner look the evidence up", async () => {
    const description = "Reversed into a pole at Westgate parking, rear bumper cracked";
    const { evidenceId, evidenceUri, photos } = await (await uploadEvidence([jpeg(), png()], "9", auth, description)).json();

    const manifest = Buffer.from(store.objects.get(`evidence/${evidenceId}.json`)!).toString();
    expect(manifest).not.toContain("Westgate");

    const lookup = (headers: Record<string, string>) =>
      app().request(`/v1/claims/evidence?uri=${encodeURIComponent(evidenceUri)}`, { headers });
    const mine = await lookup(auth);
    expect(mine.status).toBe(200);
    expect(await mine.json()).toMatchObject({ policyId: "9", description, photos: photos.map((p: { id: string }) => ({ id: p.id })) });
    expect((await lookup(strangerAuth)).status).toBe(404);
    expect((await app().request("/v1/claims/evidence", { headers: auth })).status).toBe(400);
  });

  it("limits the description length", async () => {
    expect((await uploadEvidence([jpeg()], "1", auth, "x".repeat(1_001))).status).toBe(400);
  });
});
