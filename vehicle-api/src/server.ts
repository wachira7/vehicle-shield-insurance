import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadConfig } from "./config";
import { openDatabase } from "./db";
import { onchainAssessorCheck } from "./roles";
import { filebaseStore, localStore } from "./storage";
import { databaseVerifier } from "./verification";

const config = loadConfig();
if (config.allowUnverifiedVehicles) {
  console.warn("ALLOW_UNVERIFIED_VEHICLES is on: quotes are signed for unverified vehicles. Testnet only.");
}
if (config.storage.kind === "local") {
  console.warn(`Photos are stored on local disk in ${config.storage.dir}. Set the FILEBASE_* variables to use IPFS.`);
}

if (!config.rpcUrl) {
  console.warn("RPC_URL is not set: nobody can use the assessor console until it is.");
}

const { db } = await openDatabase(config.databaseUrl);
const store = config.storage.kind === "filebase" ? filebaseStore(config.storage) : localStore(config.storage.dir);

const app = createApp({
  signer: config.signer,
  deployment: config.deployment,
  vehicleIdSalt: config.vehicleIdSalt,
  verifier: databaseVerifier(db, { allowUnverified: config.allowUnverifiedVehicles }),
  db,
  sessionSecret: config.sessionSecret,
  siweDomain: config.siweDomain,
  store,
  photoKey: config.photoKey,
  isAssessor: config.rpcUrl
    ? onchainAssessorCheck({ rpcUrl: config.rpcUrl, insuranceCore: config.deployment.contracts.InsuranceCore })
    : async () => false,
  corsOrigins: config.corsOrigins,
});

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(
    `Quote API on http://localhost:${port} for ${config.deployment.network} (InsuranceCore ${config.deployment.contracts.InsuranceCore}), signer ${config.signer.address}, storage ${config.storage.kind}`,
  );
});
