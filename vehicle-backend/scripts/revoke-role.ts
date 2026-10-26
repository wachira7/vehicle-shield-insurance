// Revokes a role, e.g. the deployer's QUOTE_SIGNER_ROLE once the API has its own key.
// Usage: ROLE=QUOTE_SIGNER_ROLE ACCOUNT=0x... yarn revoke-role --network sepolia
// PolicyNFT's roles: add CONTRACT=PolicyNFT. Refuses to leave a role with nobody holding it.
import { ethers } from "hardhat";
import { readDeployment, roleHolders, roleTarget } from "./lib/roles";

async function main() {
  if (!process.env.ROLE) throw new Error("Set ROLE, e.g. QUOTE_SIGNER_ROLE");
  if (!ethers.isAddress(process.env.ACCOUNT)) throw new Error("Set ACCOUNT to the address losing the role");
  const account = ethers.getAddress(process.env.ACCOUNT);

  const { name, role, contract, roleId } = await roleTarget(process.env.ROLE);
  if (!(await contract.hasRole(roleId, account))) {
    console.log(`${account} doesn't have ${role} on ${name}`);
    return;
  }
  const holders = await roleHolders(contract, readDeployment().startBlock ?? 0);
  const others = [...(holders.get(roleId) ?? [])].filter((holder) => holder.toLowerCase() !== account.toLowerCase());
  if (others.length === 0) throw new Error(`${account} is the only holder of ${role}; grant it to someone else first`);

  const tx = await contract.revokeRole(roleId, account);
  await tx.wait();
  console.log(`Revoked ${role} on ${name} from ${account} in tx ${tx.hash}; still held by ${others.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
