// Moves control of the contracts from the deployer's key to a Safe multisig: the Safe gets the
// admin, treasurer and pauser roles, then the deployer gives up every role it holds. Run it
// without CONFIRM first to see the plan.
// Usage: SAFE=0x... [CONFIRM=yes] yarn hand-over-admin --network sepolia
import { ethers } from "hardhat";
import { CORE_ROLES, NFT_ROLES, readDeployment, roleHolders, roleTarget } from "./lib/roles";

const SAFE_ROLES: [string, string][] = [
  ["InsuranceCore", "DEFAULT_ADMIN_ROLE"],
  ["InsuranceCore", "TREASURER_ROLE"],
  ["InsuranceCore", "PAUSER_ROLE"],
  ["PolicyNFT", "DEFAULT_ADMIN_ROLE"],
];

async function main() {
  const { SAFE: safe, CONFIRM } = process.env;
  if (!safe || !ethers.isAddress(safe)) throw new Error("Set SAFE to the Safe's address");
  if ((await ethers.provider.getCode(safe)) === "0x") throw new Error(`${safe} isn't a contract on this network; deploy the Safe first`);
  const [deployer] = await ethers.getSigners();

  const toGrant = [];
  for (const [contractName, role] of SAFE_ROLES) {
    const target = await roleTarget(role, contractName);
    if (!(await target.contract.hasRole(target.roleId, safe))) toGrant.push({ ...target, role });
  }
  // Admin last: if anything fails part-way, the deployer can still put things right.
  const toRenounce = [];
  for (const [contractName, roles] of [["InsuranceCore", CORE_ROLES], ["PolicyNFT", NFT_ROLES]] as const) {
    for (const role of [...roles].reverse()) {
      const target = await roleTarget(role, contractName);
      if (await target.contract.hasRole(target.roleId, deployer.address)) toRenounce.push({ ...target, role });
    }
  }
  // Roles the Safe doesn't take over (quote signing, assessing) must already have another holder.
  const startBlock = readDeployment().startBlock ?? 0;
  for (const { name, role, contract, roleId } of toRenounce) {
    if (SAFE_ROLES.some(([contractName, safeRole]) => contractName === name && safeRole === role)) continue;
    const holders = (await roleHolders(contract, startBlock)).get(roleId) ?? new Set<string>();
    const others = [...holders].filter((holder) => holder.toLowerCase() !== deployer.address.toLowerCase());
    if (others.length === 0) throw new Error(`Only the deployer holds ${name} ${role}; grant it to its new holder first (yarn grant-role)`);
  }

  console.log(`Grant to Safe ${safe}:`);
  for (const { name, role } of toGrant) console.log(`  ${name} ${role}`);
  console.log(`Then the deployer ${deployer.address} renounces:`);
  for (const { name, role } of toRenounce) console.log(`  ${name} ${role}`);
  if (CONFIRM !== "yes") {
    console.log("Dry run. Run again with CONFIRM=yes to send these transactions.");
    return;
  }

  for (const { name, role, contract, roleId } of toGrant) {
    const tx = await contract.grantRole(roleId, safe);
    await tx.wait();
    console.log(`Granted ${name} ${role} to the Safe in tx ${tx.hash}`);
  }
  for (const [contractName, role] of SAFE_ROLES) {
    const { contract, roleId } = await roleTarget(role, contractName);
    if (!(await contract.hasRole(roleId, safe))) throw new Error(`The Safe doesn't hold ${contractName} ${role}; stopping before renouncing anything`);
  }
  for (const { name, role, contract, roleId } of toRenounce) {
    const tx = await contract.renounceRole(roleId, deployer.address);
    await tx.wait();
    console.log(`Deployer renounced ${name} ${role} in tx ${tx.hash}`);
  }
  console.log("Done. The Safe now controls admin, treasury and pausing; check with yarn list-roles.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
