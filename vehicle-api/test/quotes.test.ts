import { Wallet, verifyTypedData } from "ethers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  QUOTE_TYPES,
  deployments,
  deserializeQuote,
  quoteDomain,
  vehicleIdFor,
  type SerializedQuote,
} from "@vehicle-shield/protocol";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";
import { openDatabase, type Database } from "../src/db";
import { memoryStore } from "../src/storage";
import { staticVerifier } from "../src/verification";

const signer = Wallet.createRandom();
const deployment = deployments.sepolia;
const NOW = new Date("2026-06-01T00:00:00Z");
const BUYER = "0x44b638e43c1ec2134e3103a2aa7ed74e473130ac";

let db: Database;
let closeDb: () => Promise<void>;
beforeAll(async () => {
  ({ db, close: closeDb } = await openDatabase("pglite:"));
});
afterAll(() => closeDb());

function makeApp(allowVehicles = true) {
  return createApp({
    signer,
    deployment,
    vehicleIdSalt: "test-salt",
    verifier: staticVerifier(allowVehicles),
    db,
    sessionSecret: "test-session-secret-test-session-secret",
    siweDomain: "localhost:3000",
    store: memoryStore(),
    photoKey: Buffer.alloc(32, 1),
    isAssessor: async () => false,
    corsOrigins: ["http://localhost:3000"],
    now: () => NOW,
  });
}

const estimateBody = {
  vehicle: {
    year: 2022,
    marketValueUsdc: 20_000,
    mileageKm: 60_000,
    condition: 8,
    accidentsLast3Years: 0,
    usage: "private",
  },
  coverageUsdc: 15_000,
  deductibleUsdc: "750.00",
  durationDays: 365,
};
const quoteBody = { ...estimateBody, buyer: BUYER, plate: "KDA 123A" };

const post = (app: ReturnType<typeof makeApp>, path: string, body: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });

describe("GET /health", () => {
  it("reports the deployment and signer", async () => {
    const res = await makeApp().request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      chainId: 11155111,
      insuranceCore: deployment.contracts.InsuranceCore,
      quoteSigner: signer.address,
    });
  });
});

describe("POST /v1/quotes/estimate", () => {
  it("prices without a wallet and explains the price", async () => {
    const res = await post(makeApp(), "/v1/quotes/estimate", estimateBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.premiumUsdc).toBe("536.09");
    expect(body.factors).toHaveLength(6);
    expect(body.factors[0]).toMatchObject({ name: "Vehicle age", multiplier: 1.1 });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  it("explains why a vehicle is declined", async () => {
    const res = await post(makeApp(), "/v1/quotes/estimate", {
      ...estimateBody,
      vehicle: { ...estimateBody.vehicle, year: 1995 },
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("not_eligible");
    expect(body.reasons[0]).toMatch(/older than 25 years/);
  });

  it.each([
    ["a missing field", { ...estimateBody, durationDays: undefined }],
    ["three decimal places", { ...estimateBody, coverageUsdc: "100.001" }],
    ["a negative amount", { ...estimateBody, coverageUsdc: -5 }],
    ["an unknown usage", { ...estimateBody, vehicle: { ...estimateBody.vehicle, usage: "racing" } }],
  ])("rejects %s", async (_, body) => {
    const res = await post(makeApp(), "/v1/quotes/estimate", body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });

  it("rejects a body that isn't JSON", async () => {
    const res = await makeApp().request("/v1/quotes/estimate", { method: "POST", body: "not json" });
    expect(res.status).toBe(400);
  });
});

describe("POST /v1/quotes", () => {
  it("returns a quote signed by the quote signer for InsuranceCore", async () => {
    const res = await post(makeApp(), "/v1/quotes", quoteBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    const quote = deserializeQuote(body.quote as SerializedQuote);

    const domain = quoteDomain(deployment.chainId, deployment.contracts.InsuranceCore);
    expect(verifyTypedData(domain, QUOTE_TYPES, quote, body.signature)).toBe(signer.address);

    expect(quote.buyer).toBe("0x44b638E43c1EC2134E3103A2aa7ed74E473130AC");
    expect(quote.vehicleId).toBe(vehicleIdFor("KDA 123A", "test-salt"));
    expect(quote.coverage).toBe(15_000_000_000n);
    expect(quote.premium).toBe(536_090_000n);
    expect(quote.deductible).toBe(750_000_000n);
    expect(quote.duration).toBe(365n * 86_400n);
    expect(quote.deadline).toBe(BigInt(NOW.getTime() / 1000 + 900));
    expect(body.expiresAt).toBe("2026-06-01T00:15:00.000Z");
    expect(body.premiumUsdc).toBe("536.09");
    expect(body.contract).toEqual({
      chainId: 11155111,
      insuranceCore: deployment.contracts.InsuranceCore,
      usdc: deployment.contracts.USDC,
    });
  });

  it("gives the same vehicle id however the plate is typed", async () => {
    const a = await (await post(makeApp(), "/v1/quotes", quoteBody)).json();
    const b = await (await post(makeApp(), "/v1/quotes", { ...quoteBody, plate: "kda123a" })).json();
    expect(a.quote.vehicleId).toBe(b.quote.vehicleId);
  });

  it("refuses to sign for an unverified vehicle", async () => {
    const res = await post(makeApp(false), "/v1/quotes", quoteBody);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "vehicle_not_verified" });
  });

  it("refuses to sign for an ineligible vehicle", async () => {
    const res = await post(makeApp(), "/v1/quotes", { ...quoteBody, coverageUsdc: 50_000 });
    expect(res.status).toBe(422);
  });

  it.each([
    ["a bad buyer address", { ...quoteBody, buyer: "0x1234" }],
    ["a bad plate", { ...quoteBody, plate: "KDA<script>" }],
  ])("rejects %s", async (_, body) => {
    const res = await post(makeApp(), "/v1/quotes", body);
    expect(res.status).toBe(400);
  });
});

describe("loadConfig", () => {
  it("fails fast without the signer key and salt", () => {
    expect(() => loadConfig({})).toThrow(/QUOTE_SIGNER_PRIVATE_KEY, VEHICLE_ID_SALT, SESSION_SECRET, PHOTO_ENCRYPTION_KEY/);
  });

  it("defaults to the committed Sepolia deployment and refuses unverified vehicles", () => {
    const config = loadConfig({
      QUOTE_SIGNER_PRIVATE_KEY: signer.privateKey,
      VEHICLE_ID_SALT: "s",
      SESSION_SECRET: "x".repeat(32),
      PHOTO_ENCRYPTION_KEY: "ab".repeat(32),
    });
    expect(config.deployment).toBe(deployments.sepolia);
    expect(config.allowUnverifiedVehicles).toBe(false);
    expect(config.signer.address).toBe(signer.address);
    expect(config.databaseUrl).toBe("pglite:./.data/pglite");
    expect(config.storage).toEqual({ kind: "local", dir: "./.data/blobs" });
  });

  it("uses Filebase only when all of its settings are present", () => {
    const base = {
      QUOTE_SIGNER_PRIVATE_KEY: signer.privateKey,
      VEHICLE_ID_SALT: "s",
      SESSION_SECRET: "x".repeat(32),
      PHOTO_ENCRYPTION_KEY: "ab".repeat(32),
    };
    expect(() => loadConfig({ ...base, FILEBASE_ACCESS_KEY: "k" })).toThrow(/Set all of FILEBASE_ACCESS_KEY/);
    const config = loadConfig({ ...base, FILEBASE_ACCESS_KEY: "k", FILEBASE_SECRET_KEY: "s", FILEBASE_BUCKET: "b" });
    expect(config.storage).toEqual({ kind: "filebase", accessKeyId: "k", secretAccessKey: "s", bucket: "b" });
  });

  it("rejects a short session secret", () => {
    expect(() =>
      loadConfig({
        QUOTE_SIGNER_PRIVATE_KEY: signer.privateKey,
        VEHICLE_ID_SALT: "s",
        SESSION_SECRET: "short",
        PHOTO_ENCRYPTION_KEY: "ab".repeat(32),
      }),
    ).toThrow(/at least 32 characters/);
  });
});
