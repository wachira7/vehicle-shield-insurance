// Read-only: who holds each role on InsuranceCore and PolicyNFT right now.
// Usage: yarn list-roles --network sepolia
import { ethers } from "hardhat";
import { CORE_ROLES, NFT_ROLES, readDeployment, roleHolders } from "./lib/roles";

async function main() {
  const deployment = readDeployment();
  for (const [name, roles] of [["InsuranceCore", CORE_ROLES], ["PolicyNFT", NFT_ROLES]] as const) {
    const contract = await ethers.getContractAt(name as "InsuranceCore", deployment.contracts[name]);
    const holders = await roleHolders(contract, deployment.startBlock ?? 0);
    console.log(`${name} (${deployment.contracts[name]})`);
    for (const role of roles) {
      const roleId = await contract.getFunction(role)();
      // Double-check each holder against the contract itself.
      const current = [];
      for (const account of holders.get(roleId) ?? []) if (await contract.hasRole(roleId, account)) current.push(account);
      console.log(`  ${role.padEnd(18)} ${current.length ? current.join(", ") : "(nobody)"}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
