// The whole customer and assessor journey against a running API and chain, with no
// shortcuts (run the API with ALLOW_UNVERIFIED_VEHICLES=false): vehicle submission and
// photos -> assessor verification -> quote and purchase -> claim evidence and claim ->
// assessor review of the evidence -> approval and payout.
// Account 0 is the assessor (it holds ASSESSOR_ROLE), account 1 the vehicle owner.
// Usage: API_URL=http://localhost:8787 yarn e2e:full --network localhost
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";
import type { Signer } from "ethers";
import { createSiweMessage } from "viem/siwe";
import { deserializeQuote } from "@vehicle-shield/protocol";

const api = process.env.API_URL || "http://localhost:8787";
const USDC = (n: number) => ethers.parseUnits(String(n), 6);
const PLATE = `FLOW ${Date.now().toString(36).toUpperCase().slice(-4)}`;
const VIEWS = ["front", "back", "left", "right", "interior", "odometer"];

async function call(method: string, pathname: string, { auth, json, form }: { auth?: string; json?: unknown; form?: FormData } = {}) {
  const response = await fetch(`${api}${pathname}`, {
    method,
    headers: { ...(auth && { Authorization: `Bearer ${auth}` }), ...(json !== undefined && { "Content-Type": "application/json" }) },
    body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
  });
  const body = response.headers.get("content-type")?.includes("json") ? await response.json() : await response.arrayBuffer();
  if (!response.ok) throw new Error(`${method} ${pathname} -> ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function signIn(signer: Signer, chainId: number) {
  const { nonce } = await call("GET", "/v1/auth/nonce");
  const message = createSiweMessage({
    address: (await signer.getAddress()) as `0x${string}`,
    chainId,
    domain: process.env.SIWE_DOMAIN || "localhost:3000",
    nonce,
    uri: "http://localhost:3000",
    version: "1",
  });
  const { token } = await call("POST", "/v1/auth/verify", { json: { message, signature: await signer.signMessage(message) } });
  return token as string;
}

const photo = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...randomBytes(3_000)])], "photo.jpg");
const step = (text: string) => console.log(`- ${text}`);

async function main() {
  const [assessor, owner] = await ethers.getSigners();
  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, `../../packages/protocol/deployments/${network.name}.json`), "utf8"),
  );
  const core = await ethers.getContractAt("InsuranceCore", deployment.contracts.InsuranceCore);
  const usdc = await ethers.getContractAt("MockUSDC", deployment.contracts.USDC);

  const ownerToken = await signIn(owner, deployment.chainId);
  const assessorToken = await signIn(assessor, deployment.chainId);
  step(`owner ${owner.address} and assessor ${assessor.address} signed in`);

  // 1. The owner submits a vehicle with all six photos.
  const vehicle = await call("POST", "/v1/vehicles", {
    auth: ownerToken,
    json: { plate: PLATE, make: "Subaru", model: "Forester", year: 2019, marketValueUsdc: 16_000, mileageKm: 70_000, condition: 8, accidentsLast3Years: 0, usage: "private" },
  });
  for (const view of VIEWS) {
    const form = new FormData();
    form.set("view", view);
    form.set("file", photo());
    await call("POST", `/v1/vehicles/${vehicle.id}/photos`, { auth: ownerToken, form });
  }
  step(`vehicle ${PLATE} submitted with ${VIEWS.length} encrypted photos`);

  // Without verification there is no quote.
  const quoteRequest = {
    buyer: owner.address,
    plate: PLATE,
    vehicle: { year: 2019, marketValueUsdc: 16_000, mileageKm: 70_000, condition: 8, accidentsLast3Years: 0, usage: "private" },
    coverageUsdc: 12_000,
    deductibleUsdc: 500,
    durationDays: 365,
  };
  const refused = await fetch(`${api}/v1/quotes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(quoteRequest) });
  if (refused.status !== 403) throw new Error(`Expected 403 before verification, got ${refused.status}`);
  step("quote refused before verification (403)");

  // 2. The assessor reviews the queue and verifies, correcting the mileage.
  const queue = await call("GET", "/v1/assessor/vehicles", { auth: assessorToken });
  if (!queue.vehicles.some((v: { id: string }) => v.id === vehicle.id)) throw new Error("Vehicle missing from the review queue");
  const detail = await call("GET", `/v1/assessor/vehicles/${vehicle.id}`, { auth: assessorToken });
  const firstPhoto = await call("GET", `/v1/assessor/photos/${detail.photos[0].id}`, { auth: assessorToken });
  await call("POST", `/v1/assessor/vehicles/${vehicle.id}/verify`, { auth: assessorToken, json: { mileageKm: 82_000, note: "Odometer reads 82,000 km" } });
  step(`assessor viewed a decrypted photo (${firstPhoto.byteLength} bytes) and verified the vehicle`);

  // 3. The owner gets a quote priced from the verified details and buys.
  const quoted = await call("POST", "/v1/quotes", { json: quoteRequest });
  if (quoted.pricedFrom !== "verified_vehicle") throw new Error("Quote was not priced from the verified vehicle");
  const quote = deserializeQuote(quoted.quote);
  await (await usdc.mint(owner.address, quote.premium)).wait();
  await (await usdc.connect(owner).approve(deployment.contracts.InsuranceCore, quote.premium)).wait();
  const policyId = await core.nextPolicyId();
  await (await core.connect(owner).buyPolicy(quote, quoted.signature)).wait();
  step(`policy #${policyId} bought for ${quoted.premiumUsdc} USDC (priced from the verified vehicle)`);

  // 4. The owner uploads evidence and submits a claim on-chain.
  const evidenceForm = new FormData();
  evidenceForm.set("policyId", policyId.toString());
  evidenceForm.append("files", photo());
  evidenceForm.append("files", photo());
  const evidence = await call("POST", "/v1/claims/evidence", { auth: ownerToken, form: evidenceForm });
  const claimId = await core.nextClaimId();
  await (await core.connect(owner).submitClaim(policyId, USDC(2_000), evidence.evidenceUri)).wait();
  step(`claim #${claimId} submitted for 2000 USDC with evidence ${evidence.evidenceUri}`);

  // 5. The assessor opens the evidence named on-chain, then reviews, approves and pays.
  const onChainUri = (await core.getClaim(claimId)).evidenceURI;
  const bundle = await call("GET", `/v1/assessor/evidence?uri=${encodeURIComponent(onChainUri)}`, { auth: assessorToken });
  for (const item of bundle.photos) await call("GET", `/v1/assessor/photos/${item.id}`, { auth: assessorToken });
  step(`assessor opened ${bundle.photos.length} evidence photos via the on-chain URI`);

  const before = await usdc.balanceOf(owner.address);
  await (await core.connect(assessor).startReview(claimId)).wait();
  await (await core.connect(assessor).approveClaim(claimId, USDC(1_800))).wait();
  await (await core.payClaim(claimId)).wait();
  const received = (await usdc.balanceOf(owner.address)) - before;
  if (received !== USDC(1_300)) throw new Error(`Expected 1300 USDC payout, got ${ethers.formatUnits(received, 6)}`);
  step("assessor approved 1800 USDC; owner received 1300 USDC after the 500 deductible");

  console.log("Full flow passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
