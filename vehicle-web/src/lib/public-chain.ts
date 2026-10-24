// Read-only chain access for public pages, which don't load the wallet stack. Lets anyone
// confirm cover straight from the contract instead of trusting our servers.
import { createPublicClient, fallback, http } from "viem";
import { sepolia } from "viem/chains";
import { insuranceCore } from "./contracts";

const rpcUrls = [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL, "https://ethereum-sepolia-rpc.publicnode.com", "https://sepolia.drpc.org"].filter(
  (url): url is string => Boolean(url),
);

export const publicClient = createPublicClient({ chain: sepolia, transport: fallback(rpcUrls.map((url) => http(url))) });

export const isPolicyActiveOnChain = (policyId: string) =>
  publicClient.readContract({ ...insuranceCore, functionName: "isPolicyActive", args: [BigInt(policyId)] });
