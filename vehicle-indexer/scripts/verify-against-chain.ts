// Compares everything the indexer serves with the contracts' own state, field by field,
// once the indexer has caught up with the chain. Exits non-zero on any mismatch.
// Usage: INDEXER_NETWORK=localhost INDEXER_URL=http://localhost:42069 yarn verify:chain
import fs from "node:fs";
import path from "node:path";
import { createPublicClient, erc20Abi, http } from "viem";
import { InsuranceCoreAbi, PolicyNFTAbi, deployments, type Deployment } from "@vehicle-shield/protocol";
import { claimStatusName } from "../src/lib";

const network = process.env.INDEXER_NETWORK ?? "sepolia";
const indexerUrl = process.env.INDEXER_URL ?? "http://localhost:42069";
const deployment: Deployment =
  network === "localhost"
    ? JSON.parse(fs.readFileSync(path.resolve("../packages/protocol/deployments/localhost.json"), "utf8"))
    : deployments[network];
const rpc = process.env.INDEXER_RPC_URL ?? (network === "localhost" ? "http://127.0.0.1:8545" : undefined);
if (!deployment || !rpc) throw new Error(`Need a deployment and INDEXER_RPC_URL for ${network}`);

const client = createPublicClient({ transport: http(rpc) });
const core = { address: deployment.contracts.InsuranceCore as `0x${string}`, abi: InsuranceCoreAbi } as const;
const nft = { address: deployment.contracts.PolicyNFT as `0x${string}`, abi: PolicyNFTAbi } as const;

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = String(actual).toLowerCase() === String(expected).toLowerCase();
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `: indexer ${actual}, chain ${expected}`}`);
}

async function get(pathname: string) {
  const response = await fetch(`${indexerUrl}${pathname}`);
  if (!response.ok) throw new Error(`${pathname} returned ${response.status}`);
  return response.json();
}

async function waitForIndexer(target: bigint) {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const status = await get("/status");
      const indexed = Object.values(status as Record<string, { block?: { number: number } }>)[0]?.block?.number;
      if (indexed !== undefined && BigInt(indexed) >= target) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Indexer did not reach block ${target}`);
}

async function main() {
  const head = await client.getBlockNumber();
  console.log(`Waiting for the indexer at ${indexerUrl} to reach block ${head} on ${network}`);
  await waitForIndexer(head);

  const policyCount = (await client.readContract({ ...core, functionName: "nextPolicyId" })) - 1n;
  const claimCount = (await client.readContract({ ...core, functionName: "nextClaimId" })) - 1n;
  let paidOutSum = 0n;
  const statusCounts: Record<string, number> = {};

  for (let id = 1n; id <= policyCount; id++) {
    const onChain = await client.readContract({ ...core, functionName: "getPolicy", args: [id] });
    const indexed = await get(`/v1/policies/${id}`);
    for (const field of ["coverage", "premium", "deductible", "paidOut", "startTime", "endTime", "cancelled"] as const) {
      check(`policy ${id} ${field}`, indexed[field], onChain[field]);
    }
    if (!onChain.cancelled) {
      const holder = await client.readContract({ ...nft, functionName: "ownerOf", args: [id] });
      check(`policy ${id} holder`, indexed.holder, holder);
    }
    paidOutSum += onChain.paidOut;
  }

  for (let id = 1n; id <= claimCount; id++) {
    const onChain = await client.readContract({ ...core, functionName: "getClaim", args: [id] });
    const indexed = await get(`/v1/claims/${id}`);
    const status = claimStatusName(onChain.status);
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    check(`claim ${id} status`, indexed.status, status);
    check(`claim ${id} policyId`, indexed.policyId, onChain.policyId);
    check(`claim ${id} requestedAmount`, indexed.requestedAmount, onChain.requestedAmount);
    check(`claim ${id} payoutAmount`, indexed.payoutAmount ?? 0, onChain.payoutAmount);
    check(`claim ${id} evidenceUri`, indexed.evidenceUri, onChain.evidenceURI);
    check(`claim ${id} timeline ends at its status`, indexed.timeline.at(-1)?.status, status);
  }

  // The list endpoints agree with the per-item ones.
  const { claims: open } = await get("/v1/claims?status=Submitted,UnderReview");
  check("open claims count", open.length, (statusCounts.Submitted ?? 0) + (statusCounts.UnderReview ?? 0));
  if (policyCount > 0n) {
    const first = await get("/v1/policies/1");
    const { policies: forVehicle } = await get(`/v1/policies?vehicleId=${first.vehicleId}`);
    check("policies by vehicle include policy 1", forVehicle.some((p: { id: string }) => p.id === "1"), true);
  }

  // Every approval or decline is listed once, with the wallet that made it.
  const { decisions } = await get("/v1/decisions");
  check(
    "decisions count",
    decisions.length,
    (statusCounts.Approved ?? 0) + (statusCounts.Paid ?? 0) + (statusCounts.Rejected ?? 0),
  );
  check("decisions name who made them", decisions.every((d: { actor?: string }) => /^0x[0-9a-f]{40}$/.test(d.actor ?? "")), true);

  const stats = await get("/v1/stats");
  check("stats policiesSold", stats.policiesSold, policyCount);
  check("stats claimsSubmitted", stats.claimsSubmitted, claimCount);
  check("stats claimsPaid", stats.claimsPaid, statusCounts.Paid ?? 0);
  check("stats claimsRejected", stats.claimsRejected, statusCounts.Rejected ?? 0);
  check("stats claimsApproved", stats.claimsApproved, (statusCounts.Approved ?? 0) + (statusCounts.Paid ?? 0));
  check("stats payoutsTotal", stats.payoutsTotal, paidOutSum);

  // Every USDC movement in or out of the pool goes through an indexed event.
  const balance = await client.readContract({
    address: deployment.contracts.USDC as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [core.address],
  });
  const ledger =
    BigInt(stats.poolFunded) +
    BigInt(stats.premiumsCollected) -
    BigInt(stats.refundsPaid) -
    BigInt(stats.payoutsTotal) -
    BigInt(stats.poolWithdrawn);
  check("pool ledger matches USDC balance", ledger, balance);

  console.log(`${policyCount} policies, ${claimCount} claims checked; ${failures} mismatch(es)`);
  if (failures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
