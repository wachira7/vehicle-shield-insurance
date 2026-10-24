import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadConfig } from "./config";
import { openDatabase } from "./db";
import { onchainAssessorCheck, onchainPolicyReader, rpcSignatureCheck } from "./roles";
import { filebaseStore, localStore } from "./storage";
import { databaseVerifier } from "./verification";
import { africasTalkingSms, logChannels, resendEmail } from "./notifications/channels";
import { createNotifier } from "./notifications/notifier";
import { indexerFeed, notificationWorker } from "./notifications/worker";

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

const isAssessor = config.rpcUrl
  ? onchainAssessorCheck({ rpcUrl: config.rpcUrl, insuranceCore: config.deployment.contracts.InsuranceCore })
  : async () => false;

// Email and SMS go out through their providers when configured; otherwise they're logged.
const { notifications } = config;
const logged = logChannels();
const notifier = createNotifier({
  db,
  appUrl: notifications.appUrl,
  isAssessor,
  channels: {
    email: notifications.email ? resendEmail(notifications.email) : logged.email,
    sms: notifications.sms ? africasTalkingSms(notifications.sms) : logged.sms,
  },
});
console.log(
  `Notifications: email ${notifications.email ? "via Resend" : "logged only"}, SMS ${notifications.sms ? `via Africa's Talking (${notifications.sms.username})` : "logged only"}`,
);
if (notifications.indexerUrl) {
  notificationWorker({ db, notifier, feed: indexerFeed(notifications.indexerUrl) }).start(notifications.pollSeconds * 1000);
} else {
  console.warn("INDEXER_URL is not set: claim, policy and renewal notifications are off.");
}

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
  verifySignature: config.rpcUrl ? rpcSignatureCheck(config.rpcUrl) : undefined,
  isAssessor,
  notifier,
  readPolicy: config.rpcUrl
    ? onchainPolicyReader({ rpcUrl: config.rpcUrl, insuranceCore: config.deployment.contracts.InsuranceCore })
    : undefined,
  corsOrigins: config.corsOrigins,
});

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(
    `Quote API on http://localhost:${port} for ${config.deployment.network} (InsuranceCore ${config.deployment.contracts.InsuranceCore}), signer ${config.signer.address}, storage ${config.storage.kind}`,
  );
});
