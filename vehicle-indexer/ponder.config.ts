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

const rpc = process.env.INDEXER_RPC_URL ?? (isLocal ? "http://127.0.0.1:8545" : undefined);
if (!rpc) throw new Error("Set INDEXER_RPC_URL to an RPC endpoint for " + network);

export default createConfig({
  database: { kind: "pglite", directory: `.ponder/pglite-${network}` },
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
