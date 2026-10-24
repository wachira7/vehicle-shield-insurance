// Who may use the assessor console is decided on-chain: the same ASSESSOR_ROLE that lets a
// wallet approve claims in InsuranceCore. Answers are cached briefly to spare the RPC.
import { createPublicClient, http, keccak256, toHex } from "viem";
import { InsuranceCoreAbi } from "@vehicle-shield/protocol";

export type RoleCheck = (address: `0x${string}`) => Promise<boolean>;

/// Verifies plain wallet signatures and smart-contract wallets alike: ERC-1271 for deployed
/// accounts, ERC-6492 for ones not deployed yet (viem's verifyMessage handles all three).
export function rpcSignatureCheck(rpcUrl: string) {
  const client = createPublicClient({ transport: http(rpcUrl) });
  return ({ address, message, signature }: { address: `0x${string}`; message: string; signature: `0x${string}` }) =>
    client.verifyMessage({ address, message, signature });
}

export const ASSESSOR_ROLE = keccak256(toHex("ASSESSOR_ROLE"));
const CACHE_MS = 60_000;

export function onchainAssessorCheck({
  rpcUrl,
  insuranceCore,
  now = () => Date.now(),
}: {
  rpcUrl: string;
  insuranceCore: string;
  now?: () => number;
}): RoleCheck {
  const client = createPublicClient({ transport: http(rpcUrl) });
  const cache = new Map<string, { value: boolean; expires: number }>();

  return async (address) => {
    const cached = cache.get(address);
    if (cached && cached.expires > now()) return cached.value;
    const value = await client.readContract({
      address: insuranceCore as `0x${string}`,
      abi: InsuranceCoreAbi,
      functionName: "hasRole",
      args: [ASSESSOR_ROLE, address],
    });
    cache.set(address, { value, expires: now() + CACHE_MS });
    return value;
  };
}
