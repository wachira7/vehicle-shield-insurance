// Whether the connected wallet can sign for the signed-in account right now.
//
// The sign-in session outlives the wallet connection: after a reload or a network blip the
// wallet can come back disconnected (or as another account) while the session is still valid.
// Pages that send transactions check this first, so people can fix it before anything is sent.

export type WalletProblem = "reconnecting" | "disconnected" | "wrong-account" | "wrong-network";

export function walletProblem({
  status,
  address,
  chainId,
  expectedAddress,
  expectedChainId,
}: {
  status: "connected" | "connecting" | "reconnecting" | "disconnected";
  address?: string;
  chainId?: number;
  expectedAddress?: string;
  expectedChainId: number;
}): WalletProblem | null {
  if (status === "connecting" || status === "reconnecting") return "reconnecting";
  if (status !== "connected" || !address) return "disconnected";
  if (expectedAddress && address.toLowerCase() !== expectedAddress.toLowerCase()) return "wrong-account";
  if (chainId !== expectedChainId) return "wrong-network";
  return null;
}
