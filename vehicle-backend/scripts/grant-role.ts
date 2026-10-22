// Grants an InsuranceCore role, e.g. to the quote API's signer.
// Usage: ROLE=QUOTE_SIGNER_ROLE ACCOUNT=0x... yarn grant-role --network sepolia
import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";

const ROLES = ["QUOTE_SIGNER_ROLE", "ASSESSOR_ROLE", "TREASURER_ROLE", "PAUSER_ROLE"];

async function main() {
  const { ROLE: role, ACCOUNT: account } = process.env;
  if (!role || !ROLES.includes(role)) throw new Error(`Set ROLE to one of ${ROLES.join(", ")}`);
  if (!account || !ethers.isAddress(account)) throw new Error("Set ACCOUNT to the address receiving the role");

  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, `../../packages/protocol/deployments/${network.name}.json`), "utf8"),
  );
  const core = await ethers.getContractAt("InsuranceCore", deployment.contracts.InsuranceCore);
  const roleId = await core.getFunction(role)();

  if (await core.hasRole(roleId, account)) {
    console.log(`${account} already has ${role}`);
    return;
  }
  const tx = await core.grantRole(roleId, account);
  await tx.wait();
  console.log(`Granted ${role} to ${account} in tx ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
