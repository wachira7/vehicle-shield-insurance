import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";

export const CORE_ROLES = ["DEFAULT_ADMIN_ROLE", "QUOTE_SIGNER_ROLE", "ASSESSOR_ROLE", "TREASURER_ROLE", "PAUSER_ROLE"];
export const NFT_ROLES = ["DEFAULT_ADMIN_ROLE", "MINTER_ROLE"];

export function readDeployment() {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, `../../../packages/protocol/deployments/${network.name}.json`), "utf8"),
  );
}

/// The contract a role lives on: PolicyNFT for MINTER_ROLE or when CONTRACT=PolicyNFT, otherwise InsuranceCore.
export async function roleTarget(role: string, contractName = process.env.CONTRACT ?? "InsuranceCore") {
  const deployment = readDeployment();
  const name = role === "MINTER_ROLE" ? "PolicyNFT" : contractName;
  const roles = name === "PolicyNFT" ? NFT_ROLES : CORE_ROLES;
  if (!roles.includes(role)) throw new Error(`${name} roles are ${roles.join(", ")}`);
  const contract = await ethers.getContractAt(name as "InsuranceCore", deployment.contracts[name]);
  return { name, contract, roleId: (await contract.getFunction(role)()) as string };
}

/// Every account holding a role now, rebuilt from RoleGranted and RoleRevoked events since the
/// deployment block (the contracts don't enumerate holders themselves).
export async function roleHolders(contract: { getAddress(): Promise<string> }, fromBlock: number) {
  const iface = new ethers.Interface([
    "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
    "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
  ]);
  const topics = [[iface.getEvent("RoleGranted")!.topicHash, iface.getEvent("RoleRevoked")!.topicHash]];
  const address = await contract.getAddress();
  const logs =
    network.name === "sepolia"
      ? await explorerLogs(address, topics[0], fromBlock)
      : await ethers.provider.getLogs({ address, topics, fromBlock });

  const holders = new Map<string, Set<string>>();
  for (const log of logs) {
    const event = iface.parseLog(log)!;
    const set = holders.get(event.args.role) ?? new Set<string>();
    if (event.name === "RoleGranted") set.add(event.args.account);
    else set.delete(event.args.account);
    holders.set(event.args.role, set);
  }
  return holders;
}

/// Free RPC plans cap eth_getLogs at a few blocks per request, so on Sepolia the events come
/// from a block explorer instead (Etherscan with ETHERSCAN_API_KEY, otherwise Blockscout, which
/// needs no key), oldest first.
async function explorerLogs(address: string, eventTopics: string[], fromBlock: number) {
  const key = process.env.ETHERSCAN_API_KEY;
  const logs: { topics: string[]; data: string; blockNumber: number; logIndex: number }[] = [];
  for (const topic0 of eventTopics) {
    const params = new URLSearchParams({
      module: "logs",
      action: "getLogs",
      address,
      topic0,
      fromBlock: String(fromBlock),
      toBlock: "latest",
      ...(key ? { chainid: "11155111", offset: "1000", apikey: key } : {}),
    });
    const base = key ? "https://api.etherscan.io/v2/api" : "https://eth-sepolia.blockscout.com/api";
    const body = await (await fetch(`${base}?${params}`)).json();
    if (body.status !== "1" && !/no (records|logs) found/i.test(body.message)) throw new Error(`Explorer: ${body.message}`);
    for (const log of body.result ?? [])
      logs.push({ topics: log.topics, data: log.data, blockNumber: Number(log.blockNumber), logIndex: Number(log.logIndex) });
  }
  return logs.sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
}
