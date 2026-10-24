"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConfig, useReadContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { useToast } from "@/components/toast";
import { Button, ButtonLink, Card } from "@/components/ui";
import { WalletNotice, useWalletCheck } from "@/components/wallet-check";
import type { PolicyDetail } from "@/lib/api";
import { chain } from "@/lib/chain";
import { describeTxError, explorerTx, insuranceCore, technicalDetails } from "@/lib/contracts";
import { RENEWAL_WINDOW_DAYS } from "@/lib/cover-options";
import { formatUsdcUnits } from "@/lib/format";
import { daysLeft } from "@/lib/next-step";
import { renewHref } from "@/lib/renewal";
import { connectedWalletClient } from "@/lib/wallet-client";

const day = (seconds: string) => new Date(Number(seconds) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/// Renew and cancel, for the policy's holder.
export function PolicyActions({ policy, vehicleRecordId, newerPolicy }: { policy: PolicyDetail; vehicleRecordId?: string; newerPolicy: boolean }) {
  const active = policy.status === "active";
  const lapsed = policy.status === "expired" || policy.status === "cancelled";
  const endingSoon = active && daysLeft(policy.endTime) <= RENEWAL_WINDOW_DAYS;

  return (
    <div className="space-y-6">
      {(endingSoon || (lapsed && !newerPolicy)) && (
        <Card className={lapsed ? "border-action/30" : ""}>
          <h2 className="font-semibold">Renew</h2>
          {endingSoon ? (
            <p className="mt-1 text-sm text-ink-muted">
              Cover ends on {day(policy.endTime)}. Renewal opens that day with the same terms ready; one car can only have one active policy at a time.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-muted">This car isn&apos;t covered right now. Renew with the same terms, priced again from its confirmed details.</p>
              {vehicleRecordId ? (
                <ButtonLink href={renewHref(vehicleRecordId, policy.id)} className="mt-4 w-full">
                  Renew cover
                </ButtonLink>
              ) : (
                <p className="mt-3 text-sm text-ink-faint">The car isn&apos;t verified on this account, so it needs verifying again first.</p>
              )}
            </>
          )}
        </Card>
      )}
      {active && <CancelCover policy={policy} />}
    </div>
  );
}

type TxState = { kind: "idle" } | { kind: "wallet" } | { kind: "confirming"; hash: `0x${string}` } | { kind: "error"; message: string; details: string };

function CancelCover({ policy }: { policy: PolicyDetail }) {
  const config = useConfig();
  const toast = useToast();
  const queryClient = useQueryClient();
  const wallet = useWalletCheck();
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<TxState>({ kind: "idle" });
  const id = BigInt(policy.id);
  const refund = useReadContract({ ...insuranceCore, functionName: "cancellationRefund", args: [id], query: { refetchInterval: 30_000 } });
  const feeBps = useReadContract({ ...insuranceCore, functionName: "cancellationFeeBps" });

  const openClaim = policy.claims.some((claim) => ["Submitted", "UnderReview", "Approved"].includes(claim.status));
  const paidOut = BigInt(policy.paidOut) > 0n;
  const blocked = openClaim
    ? "A claim on this policy is still in progress, so it can't be cancelled until that's settled."
    : paidOut
      ? "This policy has paid out a claim, so it can't be cancelled. It stays active until it ends."
      : null;
  const busy = state.kind === "wallet" || state.kind === "confirming";

  const cancel = async () => {
    try {
      setState({ kind: "wallet" });
      const client = await connectedWalletClient(config);
      const hash = await client.writeContract({ ...insuranceCore, functionName: "cancelPolicy", args: [id] });
      setState({ kind: "confirming", hash });
      await waitForTransactionReceipt(config, { hash, chainId: chain.id });
      toast(`Policy #${policy.id} cancelled. Your refund is in your wallet.`);
      setState({ kind: "idle" });
      setConfirming(false);
      setTimeout(() => void queryClient.invalidateQueries(), 3000);
    } catch (error) {
      console.error("Cancelling failed", error);
      setState({ kind: "error", message: describeTxError(error, "The policy wasn't cancelled. Please try again."), details: technicalDetails(error) });
    }
  };

  return (
    <Card>
      <h2 className="font-semibold">Cancel cover</h2>
      {blocked ? (
        <p className="mt-1 text-sm text-ink-muted">{blocked}</p>
      ) : !confirming ? (
        <>
          <p className="mt-1 text-sm text-ink-muted">
            Get back the unused part of your premium{feeBps.data !== undefined && feeBps.data > 0n ? `, minus a ${Number(feeBps.data) / 100}% fee` : ""}.
            {refund.data !== undefined && ` That's about ${formatUsdcUnits(refund.data)} today.`}
          </p>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setConfirming(true)}>
            Cancel cover…
          </Button>
        </>
      ) : (
        <div className="animate-step-in mt-3 space-y-3">
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
            <p className="font-medium">Cancel policy #{policy.id}?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
              <li>Cover ends immediately, and your proof of cover will show &quot;Not covered&quot;.</li>
              <li>You get {refund.data !== undefined ? formatUsdcUnits(refund.data) : "your refund"} back in USDC, in the same transaction.</li>
              <li>This can&apos;t be undone. You can buy new cover afterwards.</li>
            </ul>
          </div>
          {!busy && <WalletNotice problem={wallet.problem} />}
          <div className="grid gap-2">
            <Button className="bg-danger text-white hover:bg-danger/90" disabled={busy || !wallet.ready || refund.data === undefined} onClick={cancel}>
              {state.kind === "wallet"
                ? "Confirm in your wallet…"
                : state.kind === "confirming"
                  ? "Cancelling…"
                  : `Cancel and refund ${refund.data !== undefined ? formatUsdcUnits(refund.data) : ""}`}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
              Keep my cover
            </Button>
          </div>
          {state.kind === "confirming" && (
            <a href={explorerTx(state.hash)} target="_blank" rel="noreferrer" className="block text-center text-xs text-ink-faint underline">
              Track the transaction
            </a>
          )}
        </div>
      )}
      {state.kind === "error" && (
        <div role="alert" className="mt-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm">
          {state.message}
          <details className="mt-2 text-xs text-ink-muted">
            <summary className="cursor-pointer">Technical details</summary>
            <p className="mt-1 break-words font-mono">{state.details}</p>
          </details>
        </div>
      )}
    </Card>
  );
}
