import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadConfig } from "./config";
import { staticVerifier } from "./verification";

const config = loadConfig();
if (config.allowUnverifiedVehicles) {
  console.warn("ALLOW_UNVERIFIED_VEHICLES is on: quotes are signed for unverified vehicles. Testnet only.");
}

const app = createApp({
  signer: config.signer,
  deployment: config.deployment,
  vehicleIdSalt: config.vehicleIdSalt,
  verifier: staticVerifier(config.allowUnverifiedVehicles),
  corsOrigins: config.corsOrigins,
});

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(
    `Quote API on http://localhost:${port} for ${config.deployment.network} (InsuranceCore ${config.deployment.contracts.InsuranceCore}), signer ${config.signer.address}`,
  );
});
