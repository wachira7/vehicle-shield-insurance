// A wallet client for sending transactions and signing typed data from the connected wallet.
//
// Reown's embedded (Google/email) wallet answers `eth_chainId` with a CAIP-2 string such as
// "eip155:11155111" instead of the standard hex quantity, which makes viem fail before sending
// ("Cannot convert eip155:11155111 to a BigInt"). This client normalises that one answer and
// passes every other request through unchanged.
import { getConnection, type Config } from "@wagmi/core";
import { createWalletClient, custom, toHex, type EIP1193Provider } from "viem";
import { chain } from "./chain";

/// "eip155:11155111" or 11155111 -> "0xaa36a7"; anything else is returned as it came.
export function normalizeChainId(value: unknown): unknown {
  if (typeof value === "string" && /^eip155:\d+$/.test(value)) return toHex(Number(value.slice("eip155:".length)));
  if (typeof value === "number") return toHex(value);
  return value;
}

/// A viem wallet client over an EIP-1193 provider, with the chain id answer normalised.
export function walletClientFor(provider: EIP1193Provider, address: `0x${string}`) {
  return createWalletClient({
    account: address,
    chain,
    transport: custom({
      async request(args: { method: string; params?: unknown }) {
        const result = await provider.request(args as Parameters<EIP1193Provider["request"]>[0]);
        return args.method === "eth_chainId" ? normalizeChainId(result) : result;
      },
    }),
  });
}

export async function connectedWalletClient(config: Config) {
  const { connector, address } = getConnection(config);
  if (!connector || !address) throw new Error("Connect a wallet first");
  return walletClientFor((await connector.getProvider()) as EIP1193Provider, address);
}
