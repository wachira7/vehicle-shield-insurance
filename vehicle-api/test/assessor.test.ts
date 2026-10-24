import { randomBytes } from "node:crypto";
import { Wallet } from "ethers";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deployments, priceQuote, vehicleIdFor } from "@vehicle-shield/protocol";
import { createApp } from "../src/app";
import { openDatabase, schema, type Database } from "../src/db";
import { PHOTO_VIEWS } from "../src/photos";
import { memoryStore } from "../src/storage";
import { databaseVerifier } from "../src/verification";

const NOW = new Date("2026-06-01T00:00:00Z");
// What the stubbed chain says about each policy.
const chainPolicies = new Map<bigint, { vehicleId: string; startTime: Date }>();
const assessor = privateKeyToAccount(generatePrivateKey());
const ownerA = privateKeyToAccount(generatePrivateKey());
const ownerB = privateKeyToAccount(generatePrivateKey());

let db: Database;
let closeDb: () => Promise<void>;
beforeAll(async () => {
  ({ db, close: closeDb } = await openDatabase("pglite:"));
});
afterAll(() => closeDb());

const app = () =>
  createApp({
    signer: Wallet.createRandom(),
    deployment: deployments.sepolia,
    vehicleIdSalt: "salt",
    verifier: databaseVerifier(db),
    db,
    sessionSecret: "test-session-secret-test-session-secret",
    siweDomain: "localhost:3000",
    store: memoryStore(),
    photoKey: randomBytes(32),
    isAssessor: async (address) => address === assessor.address,
    readPolicy: async (policyId) => chainPolicies.get(policyId) ?? null,
    now: () => NOW,
  });

// One app instance for the whole file, so uploaded photos stay in the same store.
let api: ReturnType<typeof app>;
beforeAll(() => {
  api = app();
});

async function signIn(account: PrivateKeyAccount) {
  const { nonce } = await (await api.request("/v1/auth/nonce")).json();
  const message = createSiweMessage({
    address: account.address,
    chainId: deployments.sepolia.chainId,
    domain: "localhost:3000",
    nonce,
    uri: "http://localhost:3000",
    version: "1",
    issuedAt: NOW,
  });
  const res = await api.request("/v1/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature: await account.signMessage({ message }) }),
  });
  return { Authorization: `Bearer ${(await res.json()).token}` };
}

let asAssessor: Record<string, string>;
let asA: Record<string, string>;
let asB: Record<string, string>;
beforeAll(async () => {
  asAssessor = await signIn(assessor);
  asA = await signIn(ownerA);
  asB = await signIn(ownerB);
});

const get = (path: string, headers: Record<string, string>) => api.request(path, { headers });
const post = (path: string, body: unknown, headers: Record<string, string>) =>
  api.request(path, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });

const jpeg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(500)]);

async function submit(
  plate: string,
  headers: Record<string, string>,
  photos: readonly string[] = PHOTO_VIEWS,
  image: (view: string) => Uint8Array = () => jpeg(),
) {
  const vehicle = await (
    await post(
      "/v1/vehicles",
      {
        plate,
        make: "Mazda",
        model: "Demio",
        year: 2017,
        marketValueUsdc: 7_000,
        mileageKm: 90_000,
        condition: 8,
        accidentsLast3Years: 0,
        usage: "private",
      },
      headers,
    )
  ).json();
  for (const view of photos) {
    const form = new FormData();
    form.set("view", view);
    form.set("file", new File([new Uint8Array(image(view))], `${view}.jpg`));
    await api.request(`/v1/vehicles/${vehicle.id}/photos`, { method: "POST", headers, body: form });
  }
  return vehicle;
}

describe("assessor access", () => {
  it("needs a signed-in wallet that holds ASSESSOR_ROLE", async () => {
    expect((await api.request("/v1/assessor/vehicles")).status).toBe(401);
    const res = await get("/v1/assessor/vehicles", asA);
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe("not_an_assessor");
    expect((await get("/v1/assessor/vehicles", asAssessor)).status).toBe(200);
  });
});

describe("vehicle review", () => {
  it("lists pending vehicles oldest first, with their photos", async () => {
    const first = await submit("QUE 001", asA);
    const second = await submit("QUE 002", asB);
    const { vehicles } = await (await get("/v1/assessor/vehicles", asAssessor)).json();
    const ids = vehicles.map((v: { id: string }) => v.id);
    expect(ids.indexOf(first.id)).toBeLessThan(ids.indexOf(second.id));
    const listed = vehicles.find((v: { id: string }) => v.id === first.id);
    expect(listed.photos).toHaveLength(6);
    expect(listed.missingViews).toEqual([]);
    expect((await get("/v1/assessor/vehicles?status=bogus", asAssessor)).status).toBe(400);
  });

  it("won't verify a vehicle until all six photos are in", async () => {
    const vehicle = await submit("PHO 001", asA, ["front", "back"]);
    const res = await post(`/v1/assessor/vehicles/${vehicle.id}/verify`, {}, asAssessor);
    expect(res.status).toBe(409);
    expect((await res.json()).missingViews).toEqual(["left", "right", "interior", "odometer"]);
  });

  it("verifies with corrections, and quotes are then priced from the corrected details", async () => {
    const vehicle = await submit("VER 001", asA);
    const res = await post(
      `/v1/assessor/vehicles/${vehicle.id}/verify`,
      { condition: 5, mileageKm: 140_000, note: "Odometer shows 140k; rust on rear arch" },
      asAssessor,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "verified",
      condition: 5,
      mileageKm: 140_000,
      reviewedBy: assessor.address,
      reviewNote: "Odometer shows 140k; rust on rear arch",
    });

    const quote = await post(
      "/v1/quotes",
      {
        buyer: ownerA.address,
        plate: "VER 001",
        vehicle: { year: 2017, marketValueUsdc: 7_000, mileageKm: 90_000, condition: 8, accidentsLast3Years: 0, usage: "private" },
        coverageUsdc: 6_000,
        deductibleUsdc: 300,
        durationDays: 365,
      },
      asA,
    );
    const body = await quote.json();
    expect(body.pricedFrom).toBe("verified_vehicle");
    const expected = priceQuote(
      { year: 2017, marketValue: 7_000_000_000n, mileageKm: 140_000, condition: 5, accidentsLast3Years: 0, usage: "private" },
      { coverage: 6_000_000_000n, deductible: 300_000_000n, durationDays: 365 },
      NOW,
    );
    if (!expected.eligible) throw new Error("expected eligible");
    expect(body.quote.premium).toBe(expected.premium.toString());

    expect((await post(`/v1/assessor/vehicles/${vehicle.id}/verify`, {}, asAssessor)).status).toBe(409);
  });

  it("rejects with a reason the owner can see", async () => {
    const vehicle = await submit("REJ 001", asB);
    expect((await post(`/v1/assessor/vehicles/${vehicle.id}/reject`, {}, asAssessor)).status).toBe(400);
    const res = await post(`/v1/assessor/vehicles/${vehicle.id}/reject`, { note: "Plate not visible in the rear photo" }, asAssessor);
    expect(res.status).toBe(200);

    const { vehicles } = await (await get("/v1/vehicles", asB)).json();
    expect(vehicles.find((v: { id: string }) => v.id === vehicle.id)).toMatchObject({
      status: "rejected",
      reviewNote: "Plate not visible in the rear photo",
    });
  });

  it("insures a plate for one owner at a time", async () => {
    const original = await submit("SOLD 01", asA);
    await post(`/v1/assessor/vehicles/${original.id}/verify`, {}, asAssessor);

    const buyer = await submit("SOLD 01", asB);
    const blocked = await post(`/v1/assessor/vehicles/${buyer.id}/verify`, {}, asAssessor);
    expect(blocked.status).toBe(409);
    expect((await blocked.json()).error).toBe("verified_for_another_owner");

    await post(`/v1/assessor/vehicles/${original.id}/reject`, { note: "Vehicle sold" }, asAssessor);
    expect((await post(`/v1/assessor/vehicles/${buyer.id}/verify`, {}, asAssessor)).status).toBe(200);
  });

  it("returns 404 for unknown vehicles", async () => {
    expect((await get("/v1/assessor/vehicles/not-a-uuid", asAssessor)).status).toBe(404);
    expect((await post(`/v1/assessor/vehicles/${crypto.randomUUID()}/verify`, {}, asAssessor)).status).toBe(404);
  });
});

describe("photos and evidence", () => {
  it("lets assessors (and only assessors) view any owner's photo", async () => {
    const vehicle = await submit("VIEW 01", asA);
    const { photos } = await (await get(`/v1/assessor/vehicles/${vehicle.id}`, asAssessor)).json();
    const res = await get(`/v1/assessor/photos/${photos[0].id}`, asAssessor);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect((await get(`/v1/assessor/photos/${photos[0].id}`, asB)).status).toBe(403);
  });

  it("finds a claim's evidence by its on-chain URI", async () => {
    const form = new FormData();
    form.set("policyId", "7");
    form.set("description", "Hail damage on the bonnet");
    form.append("files", new File([new Uint8Array(jpeg())], "dent.jpg"));
    form.append("files", new File([new Uint8Array(jpeg())], "scratch.jpg"));
    form.append("views", "overview");
    form.append("views", "damage");
    const { evidenceUri } = await (await api.request("/v1/claims/evidence", { method: "POST", headers: asA, body: form })).json();

    const res = await get(`/v1/assessor/evidence?uri=${encodeURIComponent(evidenceUri)}`, asAssessor);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ owner: ownerA.address, policyId: "7", uri: evidenceUri, description: "Hail damage on the bonnet" });
    expect(body.photos).toHaveLength(2);
    expect((await get(`/v1/assessor/photos/${body.photos[0].id}`, asAssessor)).status).toBe(200);

    expect((await get("/v1/assessor/evidence?uri=ipfs%3A%2F%2Fnothing", asAssessor)).status).toBe(404);
    expect((await get("/v1/assessor/evidence", asAssessor)).status).toBe(400);
  });
});

describe("claim review", () => {
  async function fileEvidence(policyId: string, files: { bytes: Uint8Array; view: string; meta?: object }[], headers = asA) {
    const form = new FormData();
    form.set("policyId", policyId);
    form.set("description", "Side-swiped at a roundabout");
    for (const file of files) {
      form.append("files", new File([new Uint8Array(file.bytes)], "photo.jpg"));
      form.append("views", file.view);
      form.append("meta", JSON.stringify(file.meta ?? {}));
    }
    const res = await api.request("/v1/claims/evidence", { method: "POST", headers, body: form });
    expect(res.status).toBe(201);
    return (await res.json()).evidenceUri as string;
  }
  const review = (uri: string, headers = asAssessor) => get(`/v1/assessor/claims/review?uri=${encodeURIComponent(uri)}`, headers);

  it("shows the claim beside the covered car and flags a reused verification photo", async () => {
    const front = jpeg();
    const vehicle = await submit("REV 001", asA, PHOTO_VIEWS, (view) => (view === "front" ? front : jpeg()));
    await post(`/v1/assessor/vehicles/${vehicle.id}/verify`, {}, asAssessor);
    chainPolicies.set(101n, { vehicleId: vehicleIdFor("REV 001", "salt"), startTime: new Date("2026-05-01T00:00:00Z") });
    await db.insert(schema.profiles).values({ address: ownerA.address, fullName: "Achieng Otieno", email: "a@example.com" }).onConflictDoNothing();

    const uri = await fileEvidence("101", [
      { bytes: front, view: "overview" },
      { bytes: jpeg(), view: "damage", meta: { capturedAt: "2026-04-20T09:00:00Z", camera: "TECNO Spark 20" } },
      { bytes: jpeg(), view: "damage", meta: { capturedAt: "2026-05-31T09:00:00Z", camera: "Samsung A15" } },
    ]);
    const res = await review(uri);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.evidence).toMatchObject({ policyId: "101", owner: ownerA.address, description: "Side-swiped at a roundabout" });
    expect(body.claimant).toMatchObject({ fullName: "Achieng Otieno" });
    expect(body.vehicle).toMatchObject({ id: vehicle.id, plate: "REV001", status: "verified" });
    expect(body.vehicle.photos).toHaveLength(6);

    const [overview, before, recent] = body.photos;
    expect(overview.view).toBe("overview");
    expect(overview.flags).toContainEqual(
      expect.objectContaining({ kind: "duplicate", exact: true, match: { kind: "this-car-verification", view: "front" } }),
    );
    expect(before.flags).toContainEqual(expect.objectContaining({ kind: "taken-before-policy" }));
    expect(before.camera).toBe("TECNO Spark 20");
    expect(recent.flags).toEqual([]);
    expect(body.flags).toContainEqual({ kind: "several-cameras", cameras: ["TECNO Spark 20", "Samsung A15"] });
  });

  it("flags a photo reused from someone else's claim", async () => {
    const shared = jpeg();
    await fileEvidence("102", [{ bytes: shared, view: "overview" }], asB);
    const uri = await fileEvidence("103", [{ bytes: shared, view: "overview" }]);
    const [photo] = (await (await review(uri)).json()).photos;
    expect(photo.flags).toContainEqual(
      expect.objectContaining({ kind: "duplicate", exact: true, match: { kind: "other-claim", policyId: "102", sameOwner: false } }),
    );
  });

  it("checks a vehicle's own photos against other owners' cars", async () => {
    const borrowed = jpeg();
    await submit("REV 010", asB, PHOTO_VIEWS, (view) => (view === "left" ? borrowed : jpeg()));
    const vehicle = await submit("REV 011", asA, PHOTO_VIEWS, (view) => (view === "right" ? borrowed : jpeg()));
    const body = await (await get(`/v1/assessor/vehicles/${vehicle.id}`, asAssessor)).json();
    const right = body.photos.find((p: { view: string }) => p.view === "right");
    expect(body.checks[right.id].flags).toContainEqual(
      expect.objectContaining({ kind: "duplicate", exact: true, match: { kind: "other-vehicle", plate: "REV010", sameOwner: false } }),
    );
    const front = body.photos.find((p: { view: string }) => p.view === "front");
    expect(body.checks[front.id].flags).toEqual([{ kind: "no-metadata" }]);
  });

  it("still reviews a claim whose policy the chain doesn't know", async () => {
    const uri = await fileEvidence("999", [{ bytes: jpeg(), view: "overview" }]);
    const body = await (await review(uri)).json();
    expect(body.policy).toBeNull();
    expect(body.vehicle).toBeNull();
    expect(body.photos[0].flags).toEqual([{ kind: "no-metadata" }]);
  });

  it("is for assessors only, and needs a known evidence URI", async () => {
    expect((await review("ipfs://nothing")).status).toBe(404);
    expect((await get("/v1/assessor/claims/review", asAssessor)).status).toBe(400);
    expect((await review("ipfs://nothing", asA)).status).toBe(403);
    expect(await (await get("/v1/assessor/me", asAssessor)).json()).toMatchObject({ assessor: true });
    expect((await get("/v1/assessor/me", asA)).status).toBe(403);
  });
});
