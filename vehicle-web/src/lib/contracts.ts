// Contract addresses and ABIs for the browser. Imported straight from the protocol package's
// ABI and deployment files, so its Node-side helpers (ethers) stay out of the bundle.
import { InsuranceCoreAbi } from "@vehicle-shield/protocol/src/abis";
import sepolia from "@vehicle-shield/protocol/deployments/sepolia.json";
import { erc20Abi } from "viem";

export const deployment = sepolia;
export const insuranceCore = { address: sepolia.contracts.InsuranceCore as `0x${string}`, abi: InsuranceCoreAbi } as const;

export const usdcAbi = [
  ...erc20Abi,
  {
    type: "function",
    name: "nonces",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "eip712Domain",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "fields", type: "bytes1" },
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
      { name: "salt", type: "bytes32" },
      { name: "extensions", type: "uint256[]" },
    ],
  },
  // MockUSDC only (testnet faucet).
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const usdc = { address: sepolia.contracts.USDC as `0x${string}`, abi: usdcAbi } as const;
export const usdcIsMock = sepolia.usdcIsMock;

export const explorerTx = (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`;

const REVERT_MESSAGES: Record<string, string> = {
  QuoteExpired: "Your price expired before payment went through. Get a fresh price and try again.",
  QuoteAlreadyUsed: "This price was already used. Get a fresh price to continue.",
  VehicleAlreadyInsured: "This car already has active cover.",
  InvalidQuoteSigner: "This price couldn't be verified. Get a fresh price and try again.",
  NotQuoteBuyer: "This price was issued to a different wallet. Get a fresh price from this account.",
  EnforcedPause: "Buying is paused for maintenance right now. Please try again later.",
  ERC20InsufficientBalance: "You don't have enough USDC for this payment.",
  ERC20InsufficientAllowance: "The payment approval didn't go through. Please try again.",
  PolicyNotActive: "This policy isn't active, so a claim can't be filed on it.",
  ExceedsRemainingCoverage: "That's more than the cover left on this policy. Lower the amount and try again.",
  NotPolicyHolder: "Only the wallet holding this policy can do that.",
  EvidenceRequired: "Add at least one photo of the damage.",
  InvalidClaimAmount: "Enter an amount greater than zero.",
  InvalidClaimStatus: "This claim has already moved on. Refresh to see its latest status.",
};

type ErrorLike = { name?: string; message?: string; code?: number; data?: { errorName?: string }; cause?: unknown };

/// Walks an error and its causes. Matching by name rather than class, because wallet SDKs may
/// wrap errors from their own bundled copy of viem.
function findInChain(error: unknown, match: (e: ErrorLike) => boolean): ErrorLike | undefined {
  let current = error as ErrorLike | undefined;
  for (let depth = 0; current && depth < 10; depth++) {
    if (match(current)) return current;
    current = current.cause as ErrorLike | undefined;
  }
  return undefined;
}

/// The underlying error's own short description, for a "technical details" disclosure.
export function technicalDetails(error: unknown): string {
  const e = error as ErrorLike & { shortMessage?: string; details?: string };
  return [e?.name, e?.shortMessage ?? e?.message, e?.details].filter(Boolean).join(" · ").slice(0, 600);
}

/// Turns wallet and contract errors into plain words.
export function describeTxError(error: unknown): string {
  if (findInChain(error, (e) => e.name === "UserRejectedRequestError" || e.code === 4001)) {
    return "You cancelled in your wallet, so nothing was sent and you weren't charged.";
  }
  const revert = findInChain(error, (e) => e.name === "ContractFunctionRevertedError");
  const errorName = revert?.data?.errorName;
  if (errorName && REVERT_MESSAGES[errorName]) return REVERT_MESSAGES[errorName];
  const text = `${(error as ErrorLike)?.name ?? ""} ${(error as ErrorLike)?.message ?? ""}`;
  if (/insufficient funds/i.test(text)) return "Your wallet needs a little Sepolia ETH to pay the network fee.";
  if (/UserRejected|rejected|denied|cancel/i.test(text)) {
    return "You cancelled in your wallet, so nothing was sent and you weren't charged.";
  }
  return "The payment didn't go through. Nothing was charged. Please try again.";
}
