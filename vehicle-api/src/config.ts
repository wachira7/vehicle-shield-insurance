import fs from "node:fs";
import { Wallet } from "ethers";
import { deployments, type Deployment } from "@vehicle-shield/protocol";

export interface Config {
  port: number;
  signer: Wallet;
  deployment: Deployment;
  vehicleIdSalt: string;
  allowUnverifiedVehicles: boolean;
  corsOrigins: string[];
}

/// Reads configuration from the environment and fails fast on anything missing.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const missing = ["QUOTE_SIGNER_PRIVATE_KEY", "VEHICLE_ID_SALT"].filter((name) => !env[name]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

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
  };
}
