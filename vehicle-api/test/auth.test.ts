import { Wallet } from "ethers";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deployments } from "@vehicle-shield/protocol";
import { createApp } from "../src/app";
import { openDatabase, type Database } from "../src/db";
import { memoryStore } from "../src/storage";
import { staticVerifier } from "../src/verification";

const SECRET = "test-session-secret-test-session-secret";
const DOMAIN = "localhost:3000";
const CHAIN_ID = deployments.sepolia.chainId;
const user = privateKeyToAccount(generatePrivateKey());

let db: Database;
let closeDb: () => Promise<void>;
let clock = new Date("2026-06-01T00:00:00Z");

beforeAll(async () => {
  ({ db, close: closeDb } = await openDatabase("pglite:"));
});
afterAll(() => closeDb());

const app = () =>
  createApp({
    signer: Wallet.createRandom(),
    deployment: deployments.sepolia,
    vehicleIdSalt: "salt",
    verifier: staticVerifier(false),
    db,
    sessionSecret: SECRET,
    siweDomain: DOMAIN,
    store: memoryStore(),
    photoKey: Buffer.alloc(32, 1),
    now: () => clock,
  });

async function getNonce() {
  const res = await app().request("/v1/auth/nonce");
  expect(res.status).toBe(200);
  return (await res.json()).nonce as string;
}

function message(nonce: string, overrides: Partial<Parameters<typeof createSiweMessage>[0]> = {}) {
  return createSiweMessage({
    address: user.address,
    chainId: CHAIN_ID,
    domain: DOMAIN,
    nonce,
    uri: `http://${DOMAIN}`,
    version: "1",
    issuedAt: clock,
    ...overrides,
  });
}

async function verifyWith(msg: string, signature?: string) {
  return app().request("/v1/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg, signature: signature ?? (await user.signMessage({ message: msg })) }),
  });
}

async function signIn() {
  const res = await verifyWith(message(await getNonce()));
  expect(res.status).toBe(200);
  return (await res.json()).token as string;
}

const me = (token?: string) =>
  app().request("/v1/auth/me", { headers: token ? { Authorization: `Bearer ${token}` } : {} });

describe("Sign-In with Ethereum", () => {
  it("signs in and identifies the wallet", async () => {
    const res = await verifyWith(message(await getNonce()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.address).toBe(user.address);
    expect(body.expiresAt).toBe("2026-06-02T00:00:00.000Z");

    const who = await me(body.token);
    expect(who.status).toBe(200);
    expect(await who.json()).toEqual({ address: user.address });
  });

  it("issues a different nonce each time", async () => {
    expect(await getNonce()).not.toBe(await getNonce());
  });

  it("refuses a nonce that was already used", async () => {
    const msg = message(await getNonce());
    expect((await verifyWith(msg)).status).toBe(200);
    const replay = await verifyWith(msg);
    expect(replay.status).toBe(401);
    expect((await replay.json()).reason).toBe("unknown_or_expired_nonce");
  });

  it("refuses a nonce the server never issued", async () => {
    const res = await verifyWith(message("madeUpNonce12345"));
    expect((await res.json()).reason).toBe("unknown_or_expired_nonce");
  });

  it("refuses a nonce older than ten minutes", async () => {
    const nonce = await getNonce();
    clock = new Date(clock.getTime() + 11 * 60 * 1000);
    try {
      const res = await verifyWith(message(nonce));
      expect((await res.json()).reason).toBe("unknown_or_expired_nonce");
    } finally {
      clock = new Date("2026-06-01T00:00:00Z");
    }
  });

  it("refuses a message for another site", async () => {
    const res = await verifyWith(message(await getNonce(), { domain: "phishing.example" }));
    expect(res.status).toBe(401);
    expect((await res.json()).reason).toBe("invalid_message");
  });

  it("refuses a message for another chain", async () => {
    const res = await verifyWith(message(await getNonce(), { chainId: 1 }));
    expect((await res.json()).reason).toBe("wrong_chain");
  });

  it("refuses an expired message", async () => {
    const res = await verifyWith(
      message(await getNonce(), { expirationTime: new Date(clock.getTime() - 1000) }),
    );
    expect((await res.json()).reason).toBe("invalid_message");
  });

  it("refuses a signature from a different wallet", async () => {
    const msg = message(await getNonce());
    const other = privateKeyToAccount(generatePrivateKey());
    const res = await verifyWith(msg, await other.signMessage({ message: msg }));
    expect(res.status).toBe(401);
    expect((await res.json()).reason).toBe("bad_signature");
  });

  it("rejects a malformed request", async () => {
    const res = await app().request("/v1/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi", signature: "not-hex" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("session tokens", () => {
  it("are required", async () => {
    const res = await me();
    expect(res.status).toBe(401);
    expect((await res.json()).reason).toBe("missing_token");
  });

  it("can't be tampered with", async () => {
    const token = await signIn();
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: Wallet.createRandom().address, exp: 9_999_999_999 })).toString(
      "base64url",
    );
    const res = await me(`${header}.${forged}.${signature}`);
    expect((await res.json()).reason).toBe("invalid_token");
  });

  it("expire after 24 hours", async () => {
    const token = await signIn();
    clock = new Date(clock.getTime() + 24 * 60 * 60 * 1000);
    try {
      expect((await (await me(token)).json()).reason).toBe("expired_token");
    } finally {
      clock = new Date("2026-06-01T00:00:00Z");
    }
  });
});
