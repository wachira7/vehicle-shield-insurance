"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { PolicyActions } from "@/components/policy-actions";
import { QrCode } from "@/components/qr-code";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast";
import { Button, ButtonLink, Card } from "@/components/ui";
import { fetchPolicyDetail } from "@/lib/api";
import { explorerTx, insuranceCore } from "@/lib/contracts";
import { formatUsdcUnits } from "@/lib/format";
import { daysLeft, latestPolicyFor } from "@/lib/next-step";
import { usePolicies, useVehicles } from "@/lib/queries";
import { useSession } from "@/lib/session";

const day = (seconds: string) => new Date(Number(seconds) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { address } = useSession();
  const policy = useQuery({ queryKey: ["policy", id], queryFn: () => fetchPolicyDetail(id), refetchInterval: 30_000 });
  const vehicles = useVehicles();
  const policies = usePolicies();
  const remaining = useReadContract({ ...insuranceCore, functionName: "remainingCoverage", args: [BigInt(id)], query: { enabled: /^\d+$/.test(id) } });

  if (policy.isPending) return <div className="h-96 animate-pulse rounded-2xl bg-surface" />;
  const p = policy.data;
  if (!p) {
    return (
      <Card className="py-12 text-center">
        <p className="font-semibold">Policy #{id} wasn&apos;t found</p>
        <Link href="/dashboard/policies" className="mt-3 inline-block text-sm text-action hover:underline">
          Back to policies
        </Link>
      </Card>
    );
  }

  const mine = address && p.holder?.toLowerCase() === address.toLowerCase();
  const vehicle = vehicles.data?.find((v) => v.vehicleId.toLowerCase() === p.vehicleId.toLowerCase());
  const start = Number(p.startTime);
  const end = Number(p.endTime);
  const elapsed = Math.min(1, Math.max(0, (Date.now() / 1000 - start) / (end - start)));

  return (
    <div className="space-y-6">
      <Link href="/dashboard/policies" className="text-sm text-ink-muted hover:text-ink">
        ← Policies
      </Link>
      <header className="animate-step-in flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Policy #{p.id}</h1>
          <p className="mt-1 text-ink-muted">
            {vehicle ? (
              <>
                <span className="font-mono text-ink">{vehicle.plate}</span> · {vehicle.make} {vehicle.model} {vehicle.year}
              </>
            ) : (
              "Comprehensive cover"
            )}
          </p>
        </div>
        <StatusBadge status={p.status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <h2 className="font-semibold">Your cover</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Fact label="Cover" value={formatUsdcUnits(p.coverage, { whole: true })} />
              <Fact label="Cover left" value={remaining.data !== undefined ? formatUsdcUnits(remaining.data, { whole: true }) : "…"} />
              <Fact label="Deductible" value={formatUsdcUnits(p.deductible, { whole: true })} />
              <Fact label="Premium paid" value={formatUsdcUnits(p.premium)} />
              <Fact label="Paid out" value={formatUsdcUnits(p.paidOut)} />
              <Fact label={p.status === "active" ? "Days left" : "Status"} value={p.status === "active" ? String(daysLeft(p.endTime)) : p.status} />
            </dl>
            <div className="mt-6">
              <div className="flex justify-between text-xs text-ink-faint">
                <span>{day(p.startTime)}</span>
                <span>{day(p.endTime)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ${p.status === "active" ? "bg-action" : "bg-ink-faint"}`}
                  style={{ width: `${(p.status === "cancelled" ? 1 : elapsed) * 100}%` }}
                />
              </div>
            </div>
            {p.purchaseTx && (
              <a href={explorerTx(p.purchaseTx)} target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs text-ink-faint underline">
                Purchase recorded on-chain
              </a>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold">Claims on this policy</h2>
              {p.status === "active" && mine && (
                <ButtonLink href={`/dashboard/claims/new?policy=${p.id}`} variant="secondary" className="px-4 py-2">
                  File a claim
                </ButtonLink>
              )}
            </div>
            {p.claims.length ? (
              <ul className="mt-4 divide-y divide-line">
                {p.claims.map((claim) => (
                  <li key={claim.id}>
                    <Link href={`/dashboard/claims/${claim.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-ink">
                      <span>
                        Claim #{claim.id} · {formatUsdcUnits(claim.requestedAmount, { whole: true })}
                      </span>
                      <StatusBadge status={claim.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No claims yet.</p>
            )}
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <ProofOfCover policyId={p.id} active={p.status === "active"} />
          {mine && (
            <PolicyActions
              policy={p}
              vehicleRecordId={vehicle?.status === "verified" ? vehicle.id : undefined}
              newerPolicy={latestPolicyFor(policies.data ?? [], p.vehicleId)?.id !== p.id}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

/// A QR code anyone can scan (police, a garage, a buyer) to see this cover confirmed on-chain.
function ProofOfCover({ policyId, active }: { policyId: string; active: boolean }) {
  const toast = useToast();
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    setUrl(`${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/check/${policyId}`);
  }, [policyId]);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <Card className="flex flex-col items-center text-center">
      <h2 className="self-start font-semibold">Proof of cover</h2>
      <p className="mt-1 self-start text-left text-sm text-ink-muted">
        {active ? "Show this when asked for insurance. Scanning it confirms your cover live on the blockchain." : "This policy isn't active, and scanning will say so."}
      </p>
      <div className="mt-5">{url ? <QrCode value={url} label={`QR code linking to proof of cover for policy ${policyId}`} /> : <div className="size-48" />}</div>
      <div className="mt-5 grid w-full grid-cols-2 gap-2">
        <Button
          variant="secondary"
          className="px-3"
          onClick={async () => {
            if (!url) return;
            try {
              await navigator.clipboard.writeText(url);
              toast("Link copied");
            } catch {
              toast("Couldn't copy. Long-press the link below instead.", "error");
            }
          }}
        >
          Copy link
        </Button>
        {canShare ? (
          <Button
            variant="secondary"
            className="px-3"
            onClick={() => url && navigator.share({ title: `VehicleShield policy #${policyId}`, url }).catch(() => {})}
          >
            Share
          </Button>
        ) : (
          <ButtonLink href={`/check/${policyId}`} variant="secondary" className="px-3" target="_blank">
            Open
          </ButtonLink>
        )}
      </div>
      {url && <p className="mt-3 break-all text-xs text-ink-faint">{url}</p>}
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize tabular-nums">{value}</dd>
    </div>
  );
}
