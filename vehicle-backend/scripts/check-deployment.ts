// Read-only health check of a deployment recorded in deployments/<network>.json.
// Usage: yarn check:deployment --network sepolia
import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";

async function main() {
  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, `../deployments/${network.name}.json`), "utf8"),
  );
  const { InsuranceCore, PolicyNFT, USDC } = deployment.contracts;
  const core = await ethers.getContractAt("InsuranceCore", InsuranceCore);
  const nft = await ethers.getContractAt("PolicyNFT", PolicyNFT);
  const usdc = await ethers.getContractAt("MockUSDC", USDC);

  const checks: [string, boolean, string][] = [];
  const check = (name: string, ok: boolean, detail = "") => checks.push([name, ok, detail]);

  check("InsuranceCore uses the recorded USDC", (await core.paymentToken()) === USDC);
  check("InsuranceCore uses the recorded PolicyNFT", (await core.policyNFT()) === PolicyNFT);
  check("PolicyNFT lets InsuranceCore mint", await nft.hasRole(await nft.MINTER_ROLE(), InsuranceCore));
  for (const [role, holder] of Object.entries(deployment.roles as Record<string, string>)) {
    check(`${role} held by ${holder}`, await core.hasRole(await core.getFunction(role)(), holder));
  }
  check("Not paused", !(await core.paused()));

  const balance = await usdc.balanceOf(InsuranceCore);
  const free = await core.freeFunds();
  check("Pool funded", balance > 0n, `${ethers.formatUnits(balance, 6)} USDC, ${ethers.formatUnits(free, 6)} free`);
  check("Cancellation fee", true, `${Number(await core.cancellationFeeBps()) / 100}%`);
  check("Policies sold", true, `${(await core.nextPolicyId()) - 1n}`);

  for (const [name, ok, detail] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `: ${detail}` : ""}`);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
