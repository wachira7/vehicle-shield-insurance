"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConfig } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast";
import { Button, Card } from "@/components/ui";
import { fetchPhotoUrl, getMyEvidence, type ClaimRecord, type ClaimStatus } from "@/lib/api";
import { chain } from "@/lib/chain";
import { describeTxError, explorerTx, insuranceCore, technicalDetails } from "@/lib/contracts";
import { formatUsdcUnits } from "@/lib/format";
import { useClaims, usePolicies } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { connectedWalletClient } from "@/lib/wallet-client";

const when = (seconds: string) =>
  new Date(Number(seconds) * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const justFiled = useSearchParams().get("new") === "1";
  const claims = useClaims();
  const policies = usePolicies();
  const claim = claims.data?.find((c) => c.id === id);
  const policy = policies.data?.find((p) => p.id === claim?.policyId);

  if (!claim) {
    // A claim filed moments ago appears once the indexer has seen the transaction.
    if (claims.isPending || justFiled) {
      return (
        <Card className="mx-auto max-w-2xl py-12 text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-action border-t-transparent" />
          <p className="mt-4 font-medium">{justFiled ? "Recording your claim…" : "Loading claim…"}</p>
          {justFiled && <p className="mt-1 text-sm text-ink-muted">It appears here within a few seconds.</p>}
        </Card>
      );
    }
    return (
      <Card className="mx-auto max-w-2xl py-12 text-center">
        <p className="font-semibold">Claim not found</p>
        <Link href="/dashboard/claims" className="mt-2 inline-block text-sm text-action hover:underline">
          Back to claims
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard/claims" className="text-sm text-ink-muted hover:text-ink">
        ← Claims
      </Link>
      <header className="animate-step-in flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Claim #{claim.id}</h1>
          <p className="mt-1 text-ink-muted">
            On policy #{claim.policyId} · filed {when(claim.submittedAt)}
          </p>
        </div>
        <StatusBadge status={claim.status} />
      </header>

      <PayoutCard claim={claim} deductible={policy?.deductible} />
      <Timeline claim={claim} />
      <Evidence uri={claim.evidenceUri} />
    </div>
  );
}

function PayoutCard({ claim, deductible }: { claim: ClaimRecord; deductible?: string }) {
  const config = useConfig();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [state, setState] = useState<{ kind: "idle" | "wallet" } | { kind: "confirming"; hash: `0x${string}` } | { kind: "error"; message: string; details: string }>({
    kind: "idle",
  });

  const collect = async () => {
    try {
      setState({ kind: "wallet" });
      const wallet = await connectedWalletClient(config);
      const hash = await wallet.writeContract({ ...insuranceCore, functionName: "payClaim", args: [BigInt(claim.id)] });
      setState({ kind: "confirming", hash });
      await waitForTransactionReceipt(config, { hash, chainId: chain.id });
      toast(`${formatUsdcUnits(claim.payoutAmount ?? "0")} sent to your wallet`);
      setState({ kind: "idle" });
      setTimeout(() => void queryClient.invalidateQueries({ queryKey: ["claims"] }), 4000);
    } catch (error) {
      console.error("Collecting payout failed", error);
      setState({ kind: "error", message: describeTxError(error), details: technicalDetails(error) });
    }
  };

  const rows: [string, string, string?][] = [["You claimed", formatUsdcUnits(claim.requestedAmount)]];
  if (claim.approvedAmount) rows.push(["Assessor approved", formatUsdcUnits(claim.approvedAmount)]);
  if (claim.approvedAmount && deductible) rows.push(["Your deductible", `− ${formatUsdcUnits(deductible)}`]);
  if (claim.payoutAmount) rows.push([claim.status === "Paid" ? "Paid to you" : "You'll receive", formatUsdcUnits(claim.payoutAmount), "highlight"]);

  return (
    <Card className="space-y-4">
      <dl className="divide-y divide-line rounded-2xl border border-line">
        {rows.map(([label, value, highlight]) => (
          <div key={label} className="flex items-baseline justify-between px-4 py-3">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className={`tabular-nums ${highlight ? "text-xl font-semibold text-action" : "font-semibold"}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {claim.status === "Rejected" && claim.rejectionReason && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
          <p className="font-medium">The assessor&apos;s reason</p>
          <p className="mt-1 text-ink-muted">{claim.rejectionReason}</p>
        </div>
      )}
      {(claim.status === "Submitted" || claim.status === "UnderReview") && (
        <p className="text-sm text-ink-muted">
          {claim.status === "Submitted"
            ? "Waiting for an assessor to pick it up. This page updates by itself."
            : "An assessor is reviewing your photos against your policy."}
        </p>
      )}
      {claim.status === "Approved" && (
        <>
          <p className="text-sm text-ink-muted">Approved. Collect the payout now, or it will be sent to you shortly.</p>
          {state.kind === "error" && (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
              {state.message}
              <details className="mt-2 text-xs text-ink-muted">
                <summary className="cursor-pointer">Technical details</summary>
                <p className="mt-1 break-words font-mono">{state.details}</p>
              </details>
            </div>
          )}
          <Button className="w-full" onClick={collect} disabled={state.kind === "wallet" || state.kind === "confirming"}>
            {state.kind === "wallet" ? "Confirm in your wallet…" : state.kind === "confirming" ? "Sending your payout…" : `Collect ${formatUsdcUnits(claim.payoutAmount ?? "0")}`}
          </Button>
          {state.kind === "confirming" && (
            <a href={explorerTx(state.hash)} target="_blank" rel="noreferrer" className="block text-center text-xs text-ink-faint underline">
              Track the transaction
            </a>
          )}
        </>
      )}
    </Card>
  );
}

function Timeline({ claim }: { claim: ClaimRecord }) {
  const reached = new Map(claim.timeline.map((event) => [event.status, event]));
  const declined = claim.status === "Rejected";
  const steps: { status: ClaimStatus; label: string; detail: string }[] = [
    { status: "Submitted", label: "Claim filed", detail: "Photos and amount received" },
    { status: "UnderReview", label: "Under review", detail: "An assessor is checking it" },
    declined
      ? { status: "Rejected", label: "Declined", detail: "With a written reason" }
      : { status: "Approved", label: "Approved", detail: "Amount confirmed" },
    ...(declined ? [] : [{ status: "Paid" as const, label: "Paid", detail: "Sent to your wallet" }]),
  ];

  return (
    <Card>
      <h2 className="font-semibold">Progress</h2>
      <ol className="mt-5 space-y-0">
        {steps.map((step, index) => {
          const event = reached.get(step.status);
          // A claim can be approved straight from "Submitted", skipping review.
          const skipped = !event && step.status === "UnderReview" && (reached.has("Approved") || reached.has("Rejected"));
          const done = Boolean(event);
          const last = index === steps.length - 1;
          return (
            <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && <span aria-hidden className={`absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-0.5 ${done ? "bg-action" : "bg-line"}`} />}
              <span
                className={`relative z-10 grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition-colors duration-500 ${
                  done ? (step.status === "Rejected" ? "border-danger bg-danger text-white" : "border-action bg-action text-action-ink") : "border-line bg-bg text-transparent"
                }`}
              >
                {step.status === "Rejected" ? "!" : "✓"}
              </span>
              <div className={done || skipped ? "" : "opacity-50"}>
                <p className="font-medium">{step.label}</p>
                <p className="text-sm text-ink-muted">
                  {event ? when(event.timestamp) : skipped ? "Skipped" : step.detail}
                </p>
                {event && (
                  <a href={explorerTx(event.txHash)} target="_blank" rel="noreferrer" className="text-xs text-ink-faint underline">
                    Recorded on-chain
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function Evidence({ uri }: { uri: string }) {
  const { token } = useSession();
  const evidence = useQuery({ queryKey: ["evidence", uri], queryFn: () => getMyEvidence(token!, uri), enabled: Boolean(token) });
  return (
    <Card>
      <h2 className="font-semibold">Your evidence</h2>
      {evidence.data?.description && <p className="mt-2 whitespace-pre-line text-sm text-ink-muted">{evidence.data.description}</p>}
      {evidence.isPending ? (
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-surface-2" />
      ) : evidence.data ? (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {evidence.data.photos.map((photo) => (
            <li key={photo.id}>
              <EvidencePhoto id={photo.id} token={token!} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">Photos are unavailable right now.</p>
      )}
    </Card>
  );
}

function EvidencePhoto({ id, token }: { id: string; token: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let objectUrl: string | undefined;
    fetchPhotoUrl(token, id)
      .then((value) => setUrl((objectUrl = value)))
      .catch(() => {});
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, token]);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- decrypted photo from an object URL
    <img src={url} alt="Damage photo" className="aspect-square w-full rounded-xl border border-line object-cover" />
  ) : (
    <div className="aspect-square animate-pulse rounded-xl bg-surface-2" />
  );
}
