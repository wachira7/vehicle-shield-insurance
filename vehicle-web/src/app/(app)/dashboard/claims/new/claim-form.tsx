"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConfig, useReadContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { parseEventLogs } from "viem";
import { Steps } from "@/components/steps";
import { useToast } from "@/components/toast";
import { Button, ButtonLink, Card } from "@/components/ui";
import { WalletNotice, useWalletCheck } from "@/components/wallet-check";
import { uploadClaimEvidence, type EvidencePhoto } from "@/lib/api";
import { chain } from "@/lib/chain";
import { describeTxError, insuranceCore, technicalDetails } from "@/lib/contracts";
import { useFieldErrors } from "@/lib/form";
import { formatUsd, formatUsdcUnits } from "@/lib/format";
import { prepareImage, readCaptureMetadata } from "@/lib/images";
import { usePolicies } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { connectedWalletClient } from "@/lib/wallet-client";

const MAX_DAMAGE_PHOTOS = 9; // plus the overview: the API takes up to 10

type Picked = { file: File; preview: string };

type Phase =
  | { kind: "editing" }
  | { kind: "uploading"; progress: number }
  | { kind: "wallet" }
  | { kind: "confirming"; hash: `0x${string}` }
  | { kind: "error"; message: string; details?: string };

export function ClaimForm() {
  const router = useRouter();
  const params = useSearchParams();
  const config = useConfig();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { token } = useSession();
  const policies = usePolicies();
  const active = useMemo(() => (policies.data ?? []).filter((p) => p.status === "active"), [policies.data]);
  const [policyId, setPolicyId] = useState<string | null>(params.get("policy"));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [overview, setOverview] = useState<Picked | null>(null);
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "editing" });
  const input = useRef<HTMLInputElement>(null);
  const overviewInput = useRef<HTMLInputElement>(null);
  // The last upload, so a retry after a wallet problem doesn't upload the same photos again.
  const uploaded = useRef<{ key: string; evidenceUri: string } | null>(null);
  const wallet = useWalletCheck();
  const descriptionId = useId();

  useEffect(() => {
    if (!policyId && active.length) setPolicyId(active[0].id);
  }, [policyId, active]);

  const remaining = useReadContract({
    ...insuranceCore,
    functionName: "remainingCoverage",
    args: policyId ? [BigInt(policyId)] : undefined,
    query: { enabled: Boolean(policyId) },
  });
  const policy = active.find((p) => p.id === policyId);
  const amountUnits = BigInt(Math.max(0, Math.round(Number(amount || 0)))) * 1_000_000n;
  const errors = {
    amount: !Number(amount)
      ? "Enter how much you're claiming"
      : remaining.data !== undefined && amountUnits > remaining.data
        ? `That's more than the ${formatUsdcUnits(remaining.data, { whole: true })} of cover left`
        : undefined,
    overview: !overview ? "Add a photo of the whole car with the number plate readable" : undefined,
    photos: photos.length === 0 ? "Add at least one close-up of the damage" : undefined,
  };
  const { shown, blur, attemptSubmit, submitted } = useFieldErrors(errors);
  const busy = ["uploading", "wallet", "confirming"].includes(phase.kind);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const added = [...files].slice(0, MAX_DAMAGE_PHOTOS - photos.length).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...added]);
  };

  const submit = async () => {
    if (!attemptSubmit() || !policyId || !overview || !wallet.ready) return;
    try {
      const picked = [{ ...overview, view: "overview" as const }, ...photos.map((photo) => ({ ...photo, view: "damage" as const }))];
      const key = JSON.stringify([policyId, description, picked.map((photo) => photo.preview)]);
      let evidenceUri = uploaded.current?.key === key ? uploaded.current.evidenceUri : undefined;
      if (!evidenceUri) {
        setPhase({ kind: "uploading", progress: 0 });
        // Capture details are read from the originals: resizing drops them.
        const prepared: EvidencePhoto[] = await Promise.all(
          picked.map(async (photo) => ({ view: photo.view, meta: await readCaptureMetadata(photo.file), file: await prepareImage(photo.file) })),
        );
        ({ evidenceUri } = await uploadClaimEvidence(token!, policyId, description, prepared, (progress) =>
          setPhase({ kind: "uploading", progress }),
        ));
        uploaded.current = { key, evidenceUri };
      }

      setPhase({ kind: "wallet" });
      const client = await connectedWalletClient(config);
      const hash = await client.writeContract({
        ...insuranceCore,
        functionName: "submitClaim",
        args: [BigInt(policyId), amountUnits, evidenceUri],
      });

      setPhase({ kind: "confirming", hash });
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: chain.id });
      const [submitted] = parseEventLogs({ abi: insuranceCore.abi, logs: receipt.logs, eventName: "ClaimSubmitted" });
      toast(`Claim #${submitted.args.claimId} submitted`);
      setTimeout(() => void queryClient.invalidateQueries({ queryKey: ["claims"] }), 4000);
      router.push(`/dashboard/claims/${submitted.args.claimId}?new=1`);
    } catch (error) {
      console.error("Claim submission failed", error);
      setPhase({ kind: "error", message: describeTxError(error, "Your claim wasn't submitted. Please try again."), details: technicalDetails(error) });
    }
  };

  if (policies.isPending) return <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-2xl bg-surface" />;
  if (!active.length) {
    return (
      <Card className="mx-auto max-w-2xl py-12 text-center">
        <p className="font-semibold">You need an active policy to file a claim</p>
        <ButtonLink href="/dashboard/vehicles" className="mt-5">
          Go to vehicles
        </ButtonLink>
      </Card>
    );
  }

  const step = phase.kind === "editing" || phase.kind === "error" ? (photos.length || overview ? 1 : 0) : 2;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">File a claim</h1>
        <p className="mt-1 text-ink-muted">Tell us what happened and add photos. An assessor reviews every claim.</p>
      </header>
      <Steps steps={["What happened", "Photos", "Submit"]} current={step} />

      <Card className="space-y-6">
        {active.length > 1 && (
          <div>
            <label className="text-sm font-medium" htmlFor="policy">
              Policy
            </label>
            <select
              id="policy"
              value={policyId ?? ""}
              onChange={(e) => setPolicyId(e.target.value)}
              disabled={busy}
              className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-3"
            >
              {active.map((p) => (
                <option key={p.id} value={p.id}>
                  Policy #{p.id} · {formatUsdcUnits(p.coverage, { whole: true })} cover
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="amount" className="text-sm font-medium">
              Amount you&apos;re claiming
            </label>
            <div
              className={`mt-2 flex items-center rounded-xl border bg-bg px-3 focus-within:border-action ${shown("amount") ? "border-danger" : "border-line"}`}
            >
              <span className="text-ink-faint">$</span>
              <input
                id="amount"
                inputMode="numeric"
                value={amount}
                disabled={busy}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
                onBlur={() => blur("amount")}
                aria-invalid={Boolean(shown("amount"))}
                className="w-full bg-transparent px-2 py-3 tabular-nums outline-none"
              />
            </div>
            {shown("amount") ? (
              <p className="mt-1.5 text-xs text-danger">{shown("amount")}</p>
            ) : (
              <p className="mt-1.5 text-xs text-ink-faint">
                {remaining.data !== undefined ? `${formatUsdcUnits(remaining.data, { whole: true })} of cover left` : "Checking your cover…"}
                {policy && ` · your ${formatUsdcUnits(policy.deductible, { whole: true })} deductible comes off any payout`}
              </p>
            )}
          </div>
          <div className="sm:row-span-2">
            <label htmlFor={descriptionId} className="text-sm font-medium">
              What happened
            </label>
            <textarea
              id={descriptionId}
              value={description}
              disabled={busy}
              maxLength={1000}
              rows={5}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When and where, what was damaged, anyone else involved"
              className="mt-2 w-full resize-none rounded-xl border border-line bg-bg px-3 py-3 outline-none focus:border-action"
            />
            <p className="mt-1 text-xs text-ink-faint">Only you and the assessor see this.</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">The whole car</p>
          <p className="text-xs text-ink-faint">Step back so the whole car and its number plate are in one photo. It shows the assessor this is your insured car.</p>
          <div className="mt-3 flex items-start gap-4">
            {overview ? (
              <div className="animate-step-in relative aspect-[4/3] w-44 overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                <img src={overview.preview} alt="Whole car" className="h-full w-full object-cover" />
                {!busy && (
                  <button
                    type="button"
                    aria-label="Remove the whole-car photo"
                    onClick={() => setOverview(null)}
                    className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-bg/80 text-sm"
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => overviewInput.current?.click()}
                aria-invalid={submitted && Boolean(errors.overview)}
                className={`grid aspect-[4/3] w-44 place-items-center rounded-xl border border-dashed text-center text-xs text-ink-faint hover:border-action ${submitted && errors.overview ? "border-danger" : "border-line"}`}
              >
                <span>
                  <svg viewBox="0 0 24 24" className="mx-auto size-7" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3z" strokeLinejoin="round" />
                    <rect x="9" y="17" width="6" height="2" rx="0.5" />
                  </svg>
                  Whole car + plate
                </span>
              </button>
            )}
          </div>
          {submitted && errors.overview && <p className="mt-1.5 text-xs text-danger">{errors.overview}</p>}
          <input
            ref={overviewInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) setOverview({ file, preview: URL.createObjectURL(file) });
            }}
          />
        </div>

        <div>
          <p className="text-sm font-medium">Close-ups of the damage</p>
          <p className="text-xs text-ink-faint">One photo per damaged area, close enough to see it clearly. Up to {MAX_DAMAGE_PHOTOS}.</p>
          <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((photo, index) => (
              <li key={photo.preview} className="animate-step-in relative aspect-square overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                <img src={photo.preview} alt={`Damage photo ${index + 1}`} className="h-full w-full object-cover" />
                {!busy && (
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => setPhotos((current) => current.filter((p) => p !== photo))}
                    className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-bg/80 text-sm"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {photos.length < MAX_DAMAGE_PHOTOS && !busy && (
              <li>
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  aria-invalid={submitted && Boolean(errors.photos)}
                  className={`grid aspect-square w-full place-items-center rounded-xl border border-dashed text-center text-xs text-ink-faint hover:border-action ${submitted && errors.photos ? "border-danger" : "border-line"}`}
                >
                  <span>
                    <span className="block text-2xl">+</span>
                    Add photo
                  </span>
                </button>
              </li>
            )}
          </ul>
          {submitted && errors.photos && <p className="mt-1.5 text-xs text-danger">{errors.photos}</p>}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {phase.kind === "error" && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
            {phase.message}
            {phase.details && (
              <details className="mt-2 text-xs text-ink-muted">
                <summary className="cursor-pointer">Technical details</summary>
                <p className="mt-1 break-words font-mono">{phase.details}</p>
              </details>
            )}
          </div>
        )}

        {!busy && <WalletNotice problem={wallet.problem} />}

        <Button className="w-full" onClick={submit} disabled={busy || !wallet.ready}>
          {phase.kind === "uploading"
            ? `Uploading photos… ${Math.round(phase.progress * 100)}%`
            : phase.kind === "wallet"
              ? "Confirm in your wallet…"
              : phase.kind === "confirming"
                ? "Recording your claim…"
                : `Submit claim${amount ? ` for ${formatUsd(Number(amount), { whole: true })}` : ""}`}
        </Button>
        <p className="text-center text-xs text-ink-faint">Photos are encrypted before upload. Submitting is one transaction from your wallet.</p>
      </Card>
    </div>
  );
}
