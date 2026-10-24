import { randomBytes } from "node:crypto";
import { Wallet } from "ethers";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deployments } from "@vehicle-shield/protocol";
import { createApp } from "../src/app";
import type { SignatureCheck } from "../src/auth";
import { openDatabase, type Database } from "../src/db";
import { memoryStore } from "../src/storage";
import { staticVerifier } from "../src/verification";

const NOW = new Date("2026-06-01T00:00:00Z");
let db: Database;
let closeDb: () => Promise<void>;
beforeAll(async () => {
  ({ db, close: closeDb } = await openDatabase("pglite:"));
});
afterAll(() => closeDb());

const app = (verifySignature?: SignatureCheck) =>
  createApp({
    signer: Wallet.createRandom(),
    deployment: deployments.sepolia,
    vehicleIdSalt: "salt",
    verifier: staticVerifier(false),
    db,
    sessionSecret: "test-session-secret-test-session-secret",
    siweDomain: "localhost:3000",
    store: memoryStore(),
    photoKey: randomBytes(32),
    isAssessor: async () => false,
    verifySignature,
    now: () => NOW,
  });

async function signIn(address: `0x${string}`, sign: (message: string) => Promise<string>, api = app()) {
  const { nonce } = await (await api.request("/v1/auth/nonce")).json();
  const message = createSiweMessage({
    address,
    chainId: deployments.sepolia.chainId,
    domain: "localhost:3000",
    nonce,
    uri: "http://localhost:3000",
    version: "1",
    issuedAt: NOW,
  });
  return api.request("/v1/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature: await sign(message) }),
  });
}

async function tokenFor(account: PrivateKeyAccount) {
  const res = await signIn(account.address, (message) => account.signMessage({ message }));
  return { Authorization: `Bearer ${(await res.json()).token}` };
}

const put = (body: unknown, headers: Record<string, string>) =>
  app().request("/v1/profile", { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("profile (registration)", () => {
  it("is empty until the wallet registers, then saved and updatable", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const auth = await tokenFor(account);

    const before = await (await app().request("/v1/profile", { headers: auth })).json();
    expect(before).toEqual({ address: account.address, profile: null });

    const saved = await put({ fullName: "Wanjiru Kamau", email: "Wanjiru@Example.com ", phone: "+254 712 345 678" }, auth);
    expect(saved.status).toBe(200);
    expect((await saved.json()).profile).toMatchObject({
      fullName: "Wanjiru Kamau",
      email: "wanjiru@example.com",
      phone: "+254 712 345 678",
    });

    const updated = await put({ fullName: "Wanjiru Kamau", email: "w.kamau@example.com", phone: "" }, auth);
    expect((await updated.json()).profile).toMatchObject({ email: "w.kamau@example.com", phone: null });
  });

  it("explains which fields are wrong", async () => {
    const auth = await tokenFor(privateKeyToAccount(generatePrivateKey()));
    const res = await put({ fullName: "A", email: "not-an-email", phone: "12" }, auth);
    expect(res.status).toBe(400);
    const { fields } = await res.json();
    expect(Object.keys(fields).sort()).toEqual(["email", "fullName", "phone"]);
  });

  it("is private to each wallet and needs a session", async () => {
    const a = await tokenFor(privateKeyToAccount(generatePrivateKey()));
    const b = await tokenFor(privateKeyToAccount(generatePrivateKey()));
    await put({ fullName: "Owner A", email: "a@example.com" }, a);
    expect((await (await app().request("/v1/profile", { headers: b })).json()).profile).toBeNull();
    expect((await app().request("/v1/profile")).status).toBe(401);
  });
});

describe("smart-contract wallets", () => {
  it("sign in through the RPC-backed check when their signature isn't a plain wallet signature", async () => {
    const smartAccount = Wallet.createRandom().address as `0x${string}`;
    const contractSignature = `0x${"ab".repeat(100)}`; // e.g. an ERC-6492 wrapped signature
    const rpcCheck: SignatureCheck = async ({ address, signature }) =>
      address === smartAccount && signature === contractSignature;

    const api = app(rpcCheck);
    expect((await signIn(smartAccount, async () => contractSignature, api)).status).toBe(200);
    // The default plain-wallet check refuses the same signature.
    const refused = await signIn(smartAccount, async () => contractSignature, app());
    expect((await refused.json()).reason).toBe("bad_signature");
  });
});
