import fs from "node:fs";
import { Wallet } from "ethers";
import { deployments, type Deployment } from "@vehicle-shield/protocol";
import { parseMasterKey } from "./crypto";

export interface Config {
  port: number;
  signer: Wallet;
  deployment: Deployment;
  vehicleIdSalt: string;
  allowUnverifiedVehicles: boolean;
  corsOrigins: string[];
  databaseUrl: string;
  sessionSecret: string;
  siweDomain: string;
  photoKey: Buffer;
  rpcUrl?: string;
  storage: { kind: "filebase"; accessKeyId: string; secretAccessKey: string; bucket: string } | { kind: "local"; dir: string };
}

/// Reads configuration from the environment and fails fast on anything missing.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const missing = ["QUOTE_SIGNER_PRIVATE_KEY", "VEHICLE_ID_SALT", "SESSION_SECRET", "PHOTO_ENCRYPTION_KEY"].filter((name) => !env[name]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

  if (env.SESSION_SECRET!.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");

  const filebase = ["FILEBASE_ACCESS_KEY", "FILEBASE_SECRET_KEY", "FILEBASE_BUCKET"];
  const filebaseSet = filebase.filter((name) => env[name]);
  if (filebaseSet.length > 0 && filebaseSet.length < filebase.length) {
    throw new Error(`Set all of ${filebase.join(", ")} to use Filebase, or none to store photos locally`);
  }

  let deployment: Deployment;
  if (env.DEPLOYMENT_FILE) {
    deployment = JSON.parse(fs.readFileSync(env.DEPLOYMENT_FILE, "utf8"));
  } else {
    const network = env.DEPLOYMENT_NETWORK || "sepolia";
    deployment = deployments[network];
    if (!deployment) throw new Error(`No committed deployment for network "${network}"`);
  }

  return {
    port: Number(env.PORT || 8787),
    signer: new Wallet(env.QUOTE_SIGNER_PRIVATE_KEY!),
    deployment,
    vehicleIdSalt: env.VEHICLE_ID_SALT!,
    allowUnverifiedVehicles: env.ALLOW_UNVERIFIED_VEHICLES === "true",
    corsOrigins: (env.CORS_ORIGINS || "http://localhost:3000").split(",").map((origin) => origin.trim()),
    databaseUrl: env.DATABASE_URL || "pglite:./.data/pglite",
    sessionSecret: env.SESSION_SECRET!,
    siweDomain: env.SIWE_DOMAIN || "localhost:3000",
    photoKey: parseMasterKey(env.PHOTO_ENCRYPTION_KEY!),
    rpcUrl: env.RPC_URL || undefined,
    storage: filebaseSet.length
      ? {
          kind: "filebase",
          accessKeyId: env.FILEBASE_ACCESS_KEY!,
          secretAccessKey: env.FILEBASE_SECRET_KEY!,
          bucket: env.FILEBASE_BUCKET!,
        }
      : { kind: "local", dir: env.LOCAL_STORAGE_DIR || "./.data/blobs" },
  };
}
