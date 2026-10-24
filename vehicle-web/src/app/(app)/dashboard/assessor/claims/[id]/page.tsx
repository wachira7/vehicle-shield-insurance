"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConfig, useReadContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { FlagList } from "@/components/flag-list";
import { Lightbox, SecurePhoto, type LightboxItem } from "@/components/secure-photo";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast";
import { Button, Card } from "@/components/ui";
import { WalletNotice, useWalletCheck } from "@/components/wallet-check";
import { fetchClaim, fetchPolicyDetail, getClaimReview, type CheckedPhoto, type ClaimRecord, type ClaimReview } from "@/lib/api";
import { chain } from "@/lib/chain";
import { describeTxError, explorerTx, insuranceCore, technicalDetails } from "@/lib/contracts";
import { collapseMissingMetadata, describeFlag, describeMatch, describeSummaryFlag, worstTone } from "@/lib/flags";
import { formatUsdcUnits } from "@/lib/format";
import { VIEW_GUIDE } from "@/lib/photo-views";
import { useSession } from "@/lib/session";
import { connectedWalletClient } from "@/lib/wallet-client";

const dateTime = (value: string | number | Date) =>
  new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function ClaimReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useSession();
  const claim = useQuery({ queryKey: ["assessor", "claim", id], queryFn: () => fetchClaim(id), refetchInterval: 10_000 });
  const review = useQuery({
    queryKey: ["assessor", "review", claim.data?.evidenceUri],
    queryFn: () => getClaimReview(token!, claim.data!.evidenceUri),
    enabled: Boolean(token && claim.data),
  });
  const policy = useQuery({
    queryKey: ["policy", claim.data?.policyId],
    queryFn: () => fetchPolicyDetail(claim.data!.policyId),
    enabled: Boolean(claim.data),
  });
  const [open, setOpen] = useState<number | null>(null);

  const lightbox = useMemo(() => (review.data ? lightboxItems(review.data) : []), [review.data]);

  if (claim.isPending) return <div className="h-96 animate-pulse rounded-2xl bg-surface" />;
  if (!claim.data) {
    return (
      <Card className="py-12 text-center">
        <p className="font-semibold">Claim #{id} wasn&apos;t found</p>
        <Link href="/dashboard/assessor" className="mt-3 inline-block text-sm text-action hover:underline">
          Back to the queue
        </Link>
      </Card>
    );
  }

  const collapsed = collapseMissingMetadata(review.data?.photos ?? []);
  const data = review.data && { ...review.data, photos: collapsed.photos };
  const summary = [
    ...(data?.flags.map(describeSummaryFlag) ?? []),
    ...(collapsed.allMissing ? [{ ...describeFlag({ kind: "no-metadata" }, "claim"), title: "No capture details on any photo" }] : []),
  ];
  const allPhotoFlags = data?.photos.flatMap((photo) => photo.flags.map((flag) => describeFlag(flag, "claim", data.evidence.policyId))) ?? [];
  const tone = worstTone([...summary, ...allPhotoFlags].filter((flag) => flag.tone !== "info"));
  const openPhoto = (photoId: string) => setOpen(lightbox.findIndex((item) => item.id === photoId));

  return (
    <div className="space-y-6">
      <Link href="/dashboard/assessor" className="text-sm text-ink-muted hover:text-ink">
        ← Queue
      </Link>
      <header className="animate-step-in flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Claim #{claim.data.id}</h1>
          <p className="mt-1 text-ink-muted">
            Policy #{claim.data.policyId} · filed {dateTime(Number(claim.data.submittedAt) * 1000)}
          </p>
        </div>
        <StatusBadge status={claim.data.status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {review.isPending ? (
            <div className="h-64 animate-pulse rounded-2xl bg-surface" />
          ) : review.isError ? (
            <Card className="text-sm text-ink-muted">
              The claim&apos;s photos couldn&apos;t be loaded. They may have been uploaded through another API.
            </Card>
          ) : data ? (
            <>
              <Card className={tone === "danger" ? "border-danger/40" : tone === "warn" ? "border-warn/40" : ""}>
                <h2 className="font-semibold">
                  {tone === null ? "No warning signs found" : tone === "danger" ? "Look closely before deciding" : "Worth a second look"}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {tone === null
                    ? "The photos are new, unique and consistent. Still compare them with the insured car below."
                    : "These are prompts, not verdicts. Each photo's details are listed under it."}
                </p>
                {(summary.length > 0 || tone !== null) && (
                  <div className="mt-4">
                    <FlagList flags={dedupe([...summary, ...allPhotoFlags.filter((flag) => flag.tone !== "info")])} />
                  </div>
                )}
              </Card>

              <Card>
                <h2 className="font-semibold">What happened</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-muted">{data.evidence.description || "No description given."}</p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <Fact label="Claimant" value={data.claimant?.fullName ?? "Not registered"} />
                  <Fact label="Contact" value={[data.claimant?.phone, data.claimant?.email].filter(Boolean).join(" · ") || "—"} />
                  <Fact label="Wallet" value={<span className="font-mono text-xs">{data.evidence.owner}</span>} />
                  <Fact label="Cover started" value={data.policy ? dateTime(data.policy.startTime) : "Unknown"} />
                </dl>
              </Card>

              <section aria-labelledby="claim-photos">
                <h2 id="claim-photos" className="mb-3 font-semibold">
                  Claim photos <span className="font-normal text-ink-faint">({data.photos.length})</span>
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {data.photos.map((photo, index) => (
                    <li key={photo.id}>
                      <ClaimPhoto
                        photo={photo}
                        label={photoLabel(data.photos, index)}
                        policyId={data.evidence.policyId}
                        onOpen={() => openPhoto(photo.id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="car-photos">
                <h2 id="car-photos" className="font-semibold">
                  The insured car
                </h2>
                {data.vehicle ? (
                  <>
                    <p className="mb-3 mt-1 text-sm text-ink-muted">
                      <span className="font-mono text-ink">{data.vehicle.plate}</span> · {data.vehicle.make} {data.vehicle.model} {data.vehicle.year} ·
                      verified {data.vehicle.reviewedAt ? dateTime(data.vehicle.reviewedAt) : "—"}. Compare colour, plate and existing marks.
                    </p>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {data.vehicle.photos.map((photo) => (
                        <li key={photo.id}>
                          <SecurePhoto
                            id={photo.id}
                            scope="assessor"
                            alt={VIEW_GUIDE[photo.view]?.label ?? photo.view}
                            className="aspect-[4/3]"
                            onOpen={() => openPhoto(photo.id)}
                          />
                          <p className="mt-1 text-xs text-ink-muted">{VIEW_GUIDE[photo.view]?.label ?? photo.view}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Card className="mt-3 text-sm text-ink-muted">
                    No verified vehicle record matches this policy, so there&apos;s nothing to compare against. Treat this claim with extra care.
                  </Card>
                )}
              </section>
            </>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <DecisionPanel claim={claim.data} deductible={policy.data?.deductible} />
        </aside>
      </div>

      {open !== null && open >= 0 && (
        <Lightbox items={lightbox} index={open} scope="assessor" onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

function dedupe<T extends { title: string; detail: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.title + item.detail) && seen.add(item.title + item.detail));
}

/// "Overview", or "Damage n" counting only the damage photos.
function photoLabel(photos: CheckedPhoto[], index: number): string {
  if (photos[index].view === "overview") return "Overview";
  return `Damage ${photos.slice(0, index + 1).filter((photo) => photo.view !== "overview").length}`;
}

function lightboxItems(review: ClaimReview): LightboxItem[] {
  const claimItems = review.photos.map((photo, index): LightboxItem => {
    const duplicate = photo.flags.find((flag) => flag.kind === "duplicate");
    return {
      id: photo.id,
      label: `Claim · ${photoLabel(review.photos, index)}`,
      caption: photo.capturedAt ? `Taken ${dateTime(photo.capturedAt)}${photo.camera ? ` · ${photo.camera}` : ""}` : undefined,
      compareWith:
        duplicate?.kind === "duplicate"
          ? { id: duplicate.photoId, label: `Matches ${describeMatch(duplicate.match, review.evidence.policyId)}` }
          : undefined,
    };
  });
  const carItems = (review.vehicle?.photos ?? []).map(
    (photo): LightboxItem => ({ id: photo.id, label: `Insured car · ${VIEW_GUIDE[photo.view]?.label ?? photo.view}` }),
  );
  return [...claimItems, ...carItems];
}

function ClaimPhoto({ photo, label, policyId, onOpen }: { photo: CheckedPhoto; label: string; policyId: string; onOpen: () => void }) {
  const flags = photo.flags.map((flag) => describeFlag(flag, "claim", policyId));
  return (
    <div className="space-y-2">
      <div className="relative">
        <SecurePhoto id={photo.id} scope="assessor" alt={`Claim photo: ${label}`} className="aspect-[4/3]" onOpen={onOpen} />
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-bg/85 px-2 py-0.5 text-xs font-medium">{label}</span>
      </div>
      <p className="text-xs text-ink-muted">
        {photo.capturedAt ? `Taken ${dateTime(photo.capturedAt)}` : "Capture time unknown"}
        {photo.camera && ` · ${photo.camera}`}
        {photo.gps && (
          <>
            {" · "}
            <a
              href={`https://www.openstreetmap.org/?mlat=${photo.gps.lat}&mlon=${photo.gps.lon}#map=17/${photo.gps.lat}/${photo.gps.lon}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              where
            </a>
          </>
        )}
      </p>
      <FlagList flags={flags} compact />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  );
}

type TxState =
  | { kind: "idle" }
  | { kind: "wallet"; action: Action }
  | { kind: "confirming"; action: Action; hash: `0x${string}` }
  | { kind: "error"; message: string; details: string };
type Action = "review" | "approve" | "reject";

function DecisionPanel({ claim, deductible }: { claim: ClaimRecord; deductible?: string }) {
  const config = useConfig();
  const toast = useToast();
  const queryClient = useQueryClient();
  const wallet = useWalletCheck();
  const [state, setState] = useState<TxState>({ kind: "idle" });
  const [mode, setMode] = useState<"approve" | "reject">("approve");
  const requested = BigInt(claim.requestedAmount);
  const [amount, setAmount] = useState(() => (requested / 1_000_000n).toString());
  const [reason, setReason] = useState("");
  const remaining = useReadContract({ ...insuranceCore, functionName: "remainingCoverage", args: [BigInt(claim.policyId)] });

  const amountUnits = BigInt(Math.max(0, Math.round(Number(amount || 0)))) * 1_000_000n;
  const deductibleUnits = deductible ? BigInt(deductible) : undefined;
  const payout = deductibleUnits !== undefined && amountUnits > deductibleUnits ? amountUnits - deductibleUnits : 0n;
  const amountError =
    amountUnits === 0n ? "Enter the amount you're approving" : amountUnits > requested ? "Can't be more than the claimant asked for" : payout === 0n && deductibleUnits !== undefined ? "Nothing to pay after the deductible: decline instead" : undefined;
  const reasonError = reason.trim().length < 10 ? "Give the claimant a clear reason (10+ characters)" : undefined;
  const busy = state.kind === "wallet" || state.kind === "confirming";
  const open = claim.status === "Submitted" || claim.status === "UnderReview";

  const send = async (action: Action) => {
    try {
      setState({ kind: "wallet", action });
      const client = await connectedWalletClient(config);
      const id = BigInt(claim.id);
      const hash =
        action === "review"
          ? await client.writeContract({ ...insuranceCore, functionName: "startReview", args: [id] })
          : action === "approve"
            ? await client.writeContract({ ...insuranceCore, functionName: "approveClaim", args: [id, amountUnits] })
            : await client.writeContract({ ...insuranceCore, functionName: "rejectClaim", args: [id, reason.trim()] });
      setState({ kind: "confirming", action, hash });
      await waitForTransactionReceipt(config, { hash, chainId: chain.id });
      toast(action === "review" ? `Claim #${claim.id} is under review` : action === "approve" ? `Claim #${claim.id} approved` : `Claim #${claim.id} declined`);
      setState({ kind: "idle" });
      // The indexer needs a moment to see the new block.
      setTimeout(() => void queryClient.invalidateQueries({ queryKey: ["assessor"] }), 3000);
    } catch (error) {
      console.error("Assessor action failed", error);
      setState({ kind: "error", message: describeTxError(error, "That didn't go through. Please try again."), details: technicalDetails(error) });
    }
  };

  const rows: [string, string, boolean?][] = [
    ["Claimed", formatUsdcUnits(claim.requestedAmount)],
    ["Cover left", remaining.data !== undefined ? formatUsdcUnits(remaining.data) : "…"],
    ["Deductible", deductible ? formatUsdcUnits(deductible) : "…"],
  ];
  if (claim.approvedAmount) rows.push(["Approved", formatUsdcUnits(claim.approvedAmount)]);
  if (claim.payoutAmount) rows.push([claim.status === "Paid" ? "Paid out" : "To pay out", formatUsdcUnits(claim.payoutAmount), true]);

  return (
    <Card className="space-y-5">
      <h2 className="font-semibold">Decision</h2>
      <dl className="divide-y divide-line rounded-xl border border-line text-sm">
        {rows.map(([label, value, highlight]) => (
          <div key={label} className="flex justify-between px-3 py-2.5">
            <dt className="text-ink-muted">{label}</dt>
            <dd className={`tabular-nums ${highlight ? "font-semibold text-action" : "font-medium"}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {!open ? (
        <p className="text-sm text-ink-muted">
          {claim.status === "Rejected"
            ? `Declined: ${claim.rejectionReason ?? "no reason recorded"}`
            : claim.status === "Approved"
              ? "Approved. The claimant can collect the payout, or anyone can trigger it."
              : "Paid. Nothing left to do."}
        </p>
      ) : (
        <>
          {claim.status === "Submitted" && (
            <Button variant="secondary" className="w-full" disabled={busy || !wallet.ready} onClick={() => send("review")}>
              {state.kind !== "idle" && state.kind !== "error" && state.action === "review" ? "Starting review…" : "Start review"}
            </Button>
          )}

          <div className="grid grid-cols-2 rounded-xl border border-line p-1 text-sm" role="tablist">
            {(["approve", "reject"] as const).map((value) => (
              <button
                key={value}
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={`rounded-lg py-2 font-medium transition-colors ${mode === value ? (value === "approve" ? "bg-action/15 text-action" : "bg-danger/15 text-danger") : "text-ink-muted"}`}
              >
                {value === "approve" ? "Approve" : "Decline"}
              </button>
            ))}
          </div>

          {mode === "approve" ? (
            <div className="animate-step-in space-y-3">
              <label className="block text-sm font-medium" htmlFor="approve-amount">
                Amount to approve
              </label>
              <div className={`flex items-center rounded-xl border bg-bg px-3 focus-within:border-action ${amountError ? "border-danger" : "border-line"}`}>
                <span className="text-ink-faint">$</span>
                <input
                  id="approve-amount"
                  inputMode="numeric"
                  value={amount}
                  disabled={busy}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
                  className="w-full bg-transparent px-2 py-3 tabular-nums outline-none"
                />
              </div>
              <p className={`text-xs ${amountError ? "text-danger" : "text-ink-muted"}`}>
                {amountError ?? `Pays ${formatUsdcUnits(payout)} after the ${deductible ? formatUsdcUnits(deductible) : ""} deductible.`}
              </p>
              <Button className="w-full" disabled={busy || !wallet.ready || Boolean(amountError)} onClick={() => send("approve")}>
                {state.kind !== "idle" && state.kind !== "error" && state.action === "approve" ? "Approving…" : `Approve ${formatUsdcUnits(amountUnits, { whole: true })}`}
              </Button>
            </div>
          ) : (
            <div className="animate-step-in space-y-3">
              <label className="block text-sm font-medium" htmlFor="reject-reason">
                Reason for the claimant
              </label>
              <textarea
                id="reject-reason"
                rows={4}
                maxLength={300}
                value={reason}
                disabled={busy}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. The damage in the photos was already present when the car was verified."
                className="w-full resize-none rounded-xl border border-line bg-bg px-3 py-3 text-sm outline-none focus:border-action"
              />
              <p className="text-xs text-ink-muted">Recorded publicly on-chain. Don&apos;t include names, phone numbers or other personal details.</p>
              <Button
                className="w-full bg-danger text-white hover:bg-danger/90"
                disabled={busy || !wallet.ready || Boolean(reasonError)}
                onClick={() => send("reject")}
              >
                {state.kind !== "idle" && state.kind !== "error" && state.action === "reject" ? "Declining…" : "Decline claim"}
              </Button>
              {reason && reasonError && <p className="text-xs text-danger">{reasonError}</p>}
            </div>
          )}

          {!busy && <WalletNotice problem={wallet.problem} />}
        </>
      )}

      {state.kind === "confirming" && (
        <a href={explorerTx(state.hash)} target="_blank" rel="noreferrer" className="block text-center text-xs text-ink-faint underline">
          Track the transaction
        </a>
      )}
      {state.kind === "error" && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm">
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
