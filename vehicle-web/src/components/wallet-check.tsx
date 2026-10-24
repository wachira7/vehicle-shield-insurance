"use client";

import { useAppKit } from "@reown/appkit/react";
import { useAccount, useSwitchChain } from "wagmi";
import { chain } from "@/lib/chain";
import { useSession } from "@/lib/session";
import { walletProblem, type WalletProblem } from "@/lib/wallet-status";

/// Whether the wallet can sign for the signed-in account right now, and what's wrong if not.
export function useWalletCheck() {
  const { status, address, chainId } = useAccount();
  const { address: sessionAddress } = useSession();
  const problem = walletProblem({ status, address, chainId, expectedAddress: sessionAddress, expectedChainId: chain.id });
  return { problem, ready: problem === null };
}

/// Explains a wallet problem with the one action that fixes it. Renders nothing when ready.
export function WalletNotice({ problem }: { problem: WalletProblem | null }) {
  const { open } = useAppKit();
  const { switchChain, isPending } = useSwitchChain();
  if (!problem) return null;

  const action = "ml-1 font-semibold text-action underline disabled:opacity-50";
  return (
    <div role="status" className="animate-step-in rounded-xl border border-warn/30 bg-warn/10 p-4 text-sm">
      {problem === "reconnecting" && <>Reconnecting your wallet…</>}
      {problem === "disconnected" && (
        <>
          Your wallet isn&apos;t connected, so there&apos;s nothing to sign with. You&apos;re still signed in.
          <button className={action} onClick={() => void open()}>
            Reconnect wallet
          </button>
        </>
      )}
      {problem === "wrong-account" && (
        <>
          A different wallet account is connected than the one you signed in with. Switch back to continue.
          <button className={action} onClick={() => void open({ view: "Account" })}>
            Open wallet
          </button>
        </>
      )}
      {problem === "wrong-network" && (
        <>
          Your wallet is on another network.
          <button className={action} disabled={isPending} onClick={() => switchChain({ chainId: chain.id })}>
            Switch to {chain.name}
          </button>
        </>
      )}
    </div>
  );
}
