import { randomBytes } from "node:crypto";
import { Wallet } from "ethers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deployments } from "@vehicle-shield/protocol";
import { createApp } from "../src/app";
import { openDatabase, type Database } from "../src/db";
import { memoryStore } from "../src/storage";
import { databaseVerifier } from "../src/verification";

let db: Database;
let closeDb: () => Promise<void>;
beforeAll(async () => {
  ({ db, close: closeDb } = await openDatabase("pglite:"));
});
afterAll(() => closeDb());

function makeApp(clock: { time: number }) {
  return createApp({
    signer: Wallet.createRandom(),
    deployment: deployments.sepolia,
    vehicleIdSalt: "salt",
    verifier: databaseVerifier(db),
    db,
    sessionSecret: "test-session-secret-test-session-secret",
    siweDomain: "localhost:3000",
    store: memoryStore(),
    photoKey: randomBytes(32),
    isAssessor: async () => false,
    now: () => new Date(clock.time),
  });
}

const from = (ip: string, extra: Record<string, string> = {}) => ({ headers: { "cf-connecting-ip": ip, ...extra } });

describe("rate limits", () => {
  it("allows 20 sign-in requests a minute per client, then answers 429 until the minute is up", async () => {
    const clock = { time: Date.parse("2026-06-01T00:00:00Z") };
    const api = makeApp(clock);
    for (let i = 0; i < 20; i++) expect((await api.request("/v1/auth/nonce", from("1.1.1.1"))).status).toBe(200);
    const limited = await api.request("/v1/auth/nonce", from("1.1.1.1"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    expect((await limited.json()).error).toBe("rate_limited");

    // Other clients aren't affected, and the limit resets after a minute.
    expect((await api.request("/v1/auth/nonce", from("2.2.2.2"))).status).toBe(200);
    clock.time += 60_000;
    expect((await api.request("/v1/auth/nonce", from("1.1.1.1"))).status).toBe(200);
  });

  it("limits writes more tightly than reads", async () => {
    const api = makeApp({ time: Date.parse("2026-06-01T00:00:00Z") });
    const write = () => api.request("/v1/quotes/estimate", { method: "POST", ...from("3.3.3.3", { "Content-Type": "application/json" }), body: "{}" });
    for (let i = 0; i < 60; i++) expect((await write()).status).toBe(400); // invalid body, but counted
    expect((await write()).status).toBe(429);
    expect((await api.request("/health", from("3.3.3.3"))).status).toBe(200); // outside /v1
  });

  it("keeps CORS headers on a 429 so the browser can show the message", async () => {
    const api = createApp({
      signer: Wallet.createRandom(),
      deployment: deployments.sepolia,
      vehicleIdSalt: "salt",
      verifier: databaseVerifier(db),
      db,
      sessionSecret: "test-session-secret-test-session-secret",
      siweDomain: "localhost:3000",
      store: memoryStore(),
      photoKey: randomBytes(32),
      isAssessor: async () => false,
      corsOrigins: ["https://vsi-app.vercel.app"],
    });
    const headers = from("4.4.4.4", { Origin: "https://vsi-app.vercel.app" });
    let last: Response | undefined;
    for (let i = 0; i < 21; i++) last = await api.request("/v1/auth/nonce", headers);
    expect(last!.status).toBe(429);
    expect(last!.headers.get("access-control-allow-origin")).toBe("https://vsi-app.vercel.app");
  });
});

describe("security headers", () => {
  it("sends protective headers on API responses", async () => {
    const res = await makeApp({ time: Date.now() }).request("/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(res.headers.get("strict-transport-security")).toMatch(/max-age=/);
    expect(res.headers.get("cross-origin-resource-policy")).toBeNull();
  });
});
