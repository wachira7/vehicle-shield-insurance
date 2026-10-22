// Boots the app under real Node module loading (as `yarn start` does) and checks /health.
// The unit tests run through vitest's bundler, which can hide module-format problems.
import { Wallet } from "ethers";
import { deployments } from "@vehicle-shield/protocol";
import { createApp } from "../src/app";
import { staticVerifier } from "../src/verification";

const app = createApp({
  signer: Wallet.createRandom(),
  deployment: deployments.sepolia,
  vehicleIdSalt: "smoke",
  verifier: staticVerifier(false),
});
const response = await app.request("/health");
if (response.status !== 200) throw new Error(`/health returned ${response.status}`);
console.log("smoke ok:", JSON.stringify(await response.json()));
