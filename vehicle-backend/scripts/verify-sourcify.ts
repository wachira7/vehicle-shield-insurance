// Verifies an existing deployment on Sourcify, reading addresses from deployments/<network>.json.
// Usage: DEPLOYMENT_NETWORK=sepolia yarn verify:sourcify
import fs from "fs";
import path from "path";
import hre from "hardhat";
import { verifyOnSourcify } from "./lib/sourcify";

async function main() {
  const networkName = process.env.DEPLOYMENT_NETWORK || "sepolia";
  const file = path.join(__dirname, `../deployments/${networkName}.json`);
  const deployment = JSON.parse(fs.readFileSync(file, "utf8"));

  const targets: [string, string][] = [
    [deployment.contracts.PolicyNFT, "contracts/PolicyNFT.sol:PolicyNFT"],
    [deployment.contracts.InsuranceCore, "contracts/InsuranceCore.sol:InsuranceCore"],
  ];
  if (deployment.usdcIsMock) targets.unshift([deployment.contracts.USDC, "contracts/test/MockUSDC.sol:MockUSDC"]);

  let failed = false;
  for (const [address, contract] of targets) {
    try {
      const result = await verifyOnSourcify(hre, deployment.chainId, address, contract);
      console.log(`${contract} at ${address}: ${result}`);
    } catch (error) {
      failed = true;
      console.error(error instanceof Error ? error.message : error);
    }
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
