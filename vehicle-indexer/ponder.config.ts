import fs from "node:fs";
import path from "node:path";
import { createConfig } from "ponder";
import { InsuranceCoreAbi, PolicyNFTAbi, deployments, type Deployment } from "@vehicle-shield/protocol";

// INDEXER_NETWORK selects a committed deployment ("sepolia") or "localhost" for a local
// Hardhat node, whose deployment file the deploy script writes but git ignores.
const network = process.env.INDEXER_NETWORK ?? "sepolia";
const isLocal = network === "localhost";

const deployment: Deployment | undefined = isLocal
  ? JSON.parse(fs.readFileSync(path.resolve("../packages/protocol/deployments/localhost.json"), "utf8"))
  : deployments[network];
if (!deployment) throw new Error(`No deployment for INDEXER_NETWORK="${network}"`);

// INDEXER_RPC_URL may list several endpoints, comma-separated; Ponder spreads requests across
// them. On Sepolia, free public endpoints are added too: a free-tier key alone (e.g. Alchemy's,
// which limits log queries to ~10 blocks and a few requests a second) makes catching up slow.
// Set INDEXER_PUBLIC_RPCS=false to use only your own.
const PUBLIC_RPCS: Record<string, string[]> = {
  sepolia: ["https://ethereum-sepolia-rpc.publicnode.com", "https://sepolia.drpc.org"],
};
const configured = (process.env.INDEXER_RPC_URL ?? (isLocal ? "http://127.0.0.1:8545" : ""))
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
if (!configured.length) throw new Error("Set INDEXER_RPC_URL to an RPC endpoint for " + network);
const rpc = [...configured, ...(process.env.INDEXER_PUBLIC_RPCS === "false" ? [] : (PUBLIC_RPCS[network] ?? []))];

export default createConfig({
  // Hosted: Postgres from DATABASE_URL (each deploy indexes into its own schema, chosen with
  // --schema). Locally: embedded PGlite on disk.
  database: process.env.DATABASE_URL
    ? { kind: "postgres", connectionString: process.env.DATABASE_URL }
    : { kind: "pglite", directory: `.ponder/pglite-${network}` },
  chains: {
    // A local node restarts from scratch, so its cached RPC responses would be stale.
    [network]: { id: deployment.chainId, rpc, disableCache: isLocal },
  },
  contracts: {
    InsuranceCore: {
      chain: network,
      abi: InsuranceCoreAbi,
      address: deployment.contracts.InsuranceCore as `0x${string}`,
      startBlock: deployment.startBlock,
    },
    PolicyNFT: {
      chain: network,
      abi: PolicyNFTAbi,
      address: deployment.contracts.PolicyNFT as `0x${string}`,
      startBlock: deployment.startBlock,
    },
  },
});
