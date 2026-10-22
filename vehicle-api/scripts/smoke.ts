// Boots the app under real Node module loading (as `yarn start` does) and checks /health.
// The unit tests run through vitest's bundler, which can hide module-format problems.
import { Wallet } from "ethers";
import { deployments } from "@vehicle-shield/protocol";
import { createApp } from "../src/app";
import { openDatabase } from "../src/db";
import { staticVerifier } from "../src/verification";

const { db, close } = await openDatabase("pglite:");
const app = createApp({
  signer: Wallet.createRandom(),
  deployment: deployments.sepolia,
  vehicleIdSalt: "smoke",
  verifier: staticVerifier(false),
  db,
  sessionSecret: "smoke-test-secret-smoke-test-secret",
  siweDomain: "localhost:3000",
});
const response = await app.request("/health");
if (response.status !== 200) throw new Error(`/health returned ${response.status}`);
console.log("smoke ok:", JSON.stringify(await response.json()));
await close();
