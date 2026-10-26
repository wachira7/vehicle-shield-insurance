"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { QrCode } from "@/components/qr-code";
import { StatusBadge } from "@/components/status-badge";
import { VehicleRow } from "@/components/vehicle-row";
import { ButtonLink, Card } from "@/components/ui";
import { listNotifications, type ClaimRecord, type PolicySummary } from "@/lib/api";
import { insuranceCore } from "@/lib/contracts";
import { formatUsdcUnits } from "@/lib/format";
import { timeAgo } from "@/lib/queue";
import { daysLeft, nextStep, type NextStep } from "@/lib/next-step";
import { useClaims, usePolicies, useVehicles } from "@/lib/queries";
import { renewHref } from "@/lib/renewal";
import { useSession } from "@/lib/session";

export default function DashboardHome() {
  const { profile } = useSession();
  const vehicles = useVehicles();
  const policies = usePolicies();
  const claims = useClaims();
  const loading = vehicles.isPending || policies.isPending;
  const firstName = profile?.fullName.split(" ")[0];
  const active = (policies.data ?? []).find((policy) => policy.status === "active");

  return (
    <div className="space-y-8">
      <header className="animate-step-in">
        <h1 className="text-3xl font-semibold tracking-tight">{firstName ? `Hi, ${firstName}` : "Your dashboard"}</h1>
        <p className="mt-1 text-ink-muted">Your cover, vehicles and claims in one place.</p>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-8">
          {loading ? (
            <div className="h-36 animate-pulse rounded-2xl bg-surface" aria-label="Loading" />
          ) : vehicles.isError ? (
            <Card>
              <p className="font-medium">We couldn&apos;t load your vehicles.</p>
              <button onClick={() => vehicles.refetch()} className="mt-2 text-sm font-medium text-action hover:underline">
                Try again
              </button>
            </Card>
          ) : (
            <NextStepCard step={nextStep(vehicles.data ?? [], policies.data ?? [], claims.data ?? [])} />
          )}

          <CoverFigures policy={active} claims={claims.data} loading={policies.isPending} />

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="vehicles-heading">
              <SectionHeading id="vehicles-heading" title="Vehicles" href="/dashboard/vehicles" />
              {vehicles.isPending ? (
                <div className="h-24 animate-pulse rounded-2xl bg-surface" />
              ) : vehicles.data?.length ? (
                <ul className="space-y-3">
                  {vehicles.data.slice(0, 3).map((vehicle) => (
                    <li key={vehicle.id}>
                      <VehicleRow vehicle={vehicle} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Card className="text-sm text-ink-muted">No vehicles yet. Add one to get covered.</Card>
              )}
            </section>

            <section aria-labelledby="claims-heading">
              <SectionHeading id="claims-heading" title="Recent claims" href="/dashboard/claims" />
              {claims.isPending && policies.isSuccess ? (
                <div className="h-24 animate-pulse rounded-2xl bg-surface" />
              ) : claims.data?.length ? (
                <ul className="space-y-3">
                  {claims.data.slice(0, 3).map((claim) => (
                    <li key={claim.id}>
                      <Link href={`/dashboard/claims/${claim.id}`} className="block">
                        <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2">
                          <div>
                            <p className="font-medium">
                              Claim #{claim.id} · {formatUsdcUnits(claim.requestedAmount, { whole: true })}
                            </p>
                            <p className="text-sm text-ink-muted">Policy #{claim.policyId}</p>
                          </div>
                          <StatusBadge status={claim.status} />
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Card className="text-sm text-ink-muted">No claims. If something happens to your car, file one here with photos.</Card>
              )}
            </section>
          </div>

          <section aria-labelledby="cover-heading">
            <SectionHeading id="cover-heading" title="Policies" href="/dashboard/policies" />
            {policies.isPending ? (
              <div className="h-24 animate-pulse rounded-2xl bg-surface" />
            ) : policies.data === null ? (
              <Card className="text-sm text-ink-muted">Policy details are unavailable right now.</Card>
            ) : policies.data?.length ? (
              <ul className="grid gap-3 lg:grid-cols-2">
                {policies.data.slice(0, 4).map((policy) => (
                  <li key={policy.id}>
                    <Link href={`/dashboard/policies/${policy.id}`} className="block">
                      <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2">
                        <div>
                          <p className="font-medium">Policy #{policy.id}</p>
                          <p className="text-sm text-ink-muted">{formatUsdcUnits(policy.coverage, { whole: true })} cover</p>
                        </div>
                        <StatusBadge status={policy.status} />
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Card className="text-sm text-ink-muted">No policies yet. Verify a vehicle to buy cover.</Card>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {active && <ProofCard policyId={active.id} />}
          <RecentActivity />
          <QuickActions canClaim={Boolean(active)} />
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({ id, title, href }: { id: string; title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      <Link href={href} className="text-sm text-ink-muted hover:text-ink">
        See all
      </Link>
    </div>
  );
}

/// The active policy at a glance: cover, time left, cover left after claims, and paid out.
function CoverFigures({ policy, claims, loading }: { policy?: PolicySummary; claims?: ClaimRecord[]; loading: boolean }) {
  const remaining = useReadContract({
    ...insuranceCore,
    functionName: "remainingCoverage",
    args: policy ? [BigInt(policy.id)] : undefined,
    query: { enabled: Boolean(policy) },
  });
  if (loading) return <div className="grid h-28 animate-pulse grid-cols-2 gap-4 rounded-2xl bg-surface lg:grid-cols-4" />;
  if (!policy) return null;

  const start = Number(policy.startTime);
  const end = Number(policy.endTime);
  const elapsed = Math.min(1, Math.max(0, (Date.now() / 1000 - start) / (end - start)));
  const paid = (claims ?? []).filter((claim) => claim.status === "Paid" && claim.policyId === policy.id);
  const paidTotal = paid.reduce((sum, claim) => sum + BigInt(claim.payoutAmount ?? "0"), 0n);

  return (
    <dl className="animate-step-in grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Figure label="Your cover" value={formatUsdcUnits(policy.coverage, { whole: true })} hint={`${formatUsdcUnits(policy.deductible, { whole: true })} deductible`} />
      <Figure
        label="Days left"
        value={String(daysLeft(policy.endTime))}
        hint={
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
            <span className="block h-full rounded-full bg-action" style={{ width: `${(1 - elapsed) * 100}%` }} />
          </span>
        }
      />
      <Figure label="Cover left" value={remaining.data !== undefined ? formatUsdcUnits(remaining.data, { whole: true }) : "…"} hint="After claims on this policy" />
      <Figure label="Claims paid" value={formatUsdcUnits(paidTotal, { whole: true })} hint={`${paid.length} claim${paid.length === 1 ? "" : "s"}`} />
    </dl>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint: React.ReactNode }) {
  return (
    <Card className="p-5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold tabular-nums">{value}</dd>
      <dd className="mt-1 text-xs text-ink-faint">{hint}</dd>
    </Card>
  );
}

/// A small proof-of-cover QR code, linking to the policy page for sharing.
function ProofCard({ policyId }: { policyId: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => setUrl(`${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/check/${policyId}`), [policyId]);
  return (
    <Card className="flex items-center gap-5">
      {url ? <QrCode value={url} label={`QR code: proof of cover for policy ${policyId}`} className="size-24 shrink-0" /> : <div className="size-24" />}
      <div>
        <p className="font-semibold">Proof of cover</p>
        <p className="mt-1 text-sm text-ink-muted">Anyone can scan it to confirm your cover on the blockchain.</p>
        <Link href={`/dashboard/policies/${policyId}`} className="mt-2 inline-block text-sm font-medium text-action hover:underline">
          Share or enlarge
        </Link>
      </div>
    </Card>
  );
}

function RecentActivity() {
  const { token, address } = useSession();
  const list = useQuery({
    queryKey: ["notifications", address],
    queryFn: () => listNotifications(token!),
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });
  const items = list.data?.notifications.slice(0, 5) ?? [];
  return (
    <Card>
      <h2 className="font-semibold">Recent activity</h2>
      {list.isPending ? (
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-surface-2" />
      ) : items.length ? (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.link ?? "/dashboard"} className="group flex gap-3">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-action/70" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium group-hover:text-action">{item.title}</span>
                  <span className="block text-xs text-ink-faint">{timeAgo(Date.now() - new Date(item.createdAt).getTime())}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">Updates on your cover and claims will show here.</p>
      )}
    </Card>
  );
}

function QuickActions({ canClaim }: { canClaim: boolean }) {
  const actions = [
    ...(canClaim ? [{ href: "/dashboard/claims/new", label: "File a claim", hint: "Photos and an amount" }] : []),
    { href: "/dashboard/vehicles/new", label: "Add a vehicle", hint: "Verify another car" },
    { href: "/check", label: "Check a car's cover", hint: "By number plate" },
    { href: "/quote", label: "Get a quote", hint: "See a price instantly" },
  ];
  return (
    <Card className="p-2">
      <h2 className="px-4 pb-1 pt-3 font-semibold">Quick actions</h2>
      <ul>
        {actions.map((action) => (
          <li key={action.href}>
            <Link href={action.href} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-surface-2">
              <span>
                <span className="block text-sm font-medium">{action.label}</span>
                <span className="block text-xs text-ink-faint">{action.hint}</span>
              </span>
              <span aria-hidden className="text-ink-faint">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NextStepCard({ step }: { step: NextStep }) {
  const content: Record<NextStep["kind"], { title: string; body: string; action?: { href: string; label: string } }> = {
    "add-vehicle": {
      title: "Verify your first car",
      body: "Add your car's details and six photos. An assessor checks them, then you can buy cover.",
      action: { href: "/dashboard/vehicles/new", label: "Add a vehicle" },
    },
    "finish-photos": {
      title: "Finish your photos",
      body:
        step.kind === "finish-photos"
          ? `${6 - step.vehicle.missingViews.length} of 6 photos added for your ${step.vehicle.make} ${step.vehicle.model}.`
          : "",
      action: step.kind === "finish-photos" ? { href: `/dashboard/vehicles/${step.vehicle.id}`, label: "Add the rest" } : undefined,
    },
    "in-review": {
      title: "Your car is being reviewed",
      body: "An assessor is checking your photos and details. We'll show the result here.",
    },
    "fix-vehicle": {
      title: "Your car needs a change",
      body: step.kind === "fix-vehicle" && step.vehicle.reviewNote ? `Assessor's note: ${step.vehicle.reviewNote}` : "See what the assessor asked for.",
      action: step.kind === "fix-vehicle" ? { href: `/dashboard/vehicles/${step.vehicle.id}`, label: "See details" } : undefined,
    },
    "buy-cover": {
      title: "Your car is verified",
      body: "You can now buy cover, priced from the details the assessor confirmed.",
      action: step.kind === "buy-cover" ? { href: `/dashboard/vehicles/${step.vehicle.id}/buy`, label: "Buy cover" } : undefined,
    },
    "collect-payout": {
      title: "Your claim was approved",
      body:
        step.kind === "collect-payout"
          ? `Claim #${step.claim.id}: ${formatUsdcUnits(step.claim.payoutAmount ?? "0")} is ready for you after your deductible.`
          : "",
      action: step.kind === "collect-payout" ? { href: `/dashboard/claims/${step.claim.id}`, label: "Collect payout" } : undefined,
    },
    "renew-soon": {
      title: "Your cover ends soon",
      body:
        step.kind === "renew-soon"
          ? `Policy #${step.policy.id} ends in ${daysLeft(step.policy.endTime)} days. Renew from the day it ends to stay covered.`
          : "",
      action: step.kind === "renew-soon" ? { href: `/dashboard/policies/${step.policy.id}`, label: "See renewal" } : undefined,
    },
    renew: {
      title: "Renew your cover",
      body:
        step.kind === "renew"
          ? `Your ${step.vehicle.make} ${step.vehicle.model} isn't covered since policy #${step.policy.id} ${step.policy.status === "cancelled" ? "was cancelled" : "ended"}. Renew with the same terms in a minute.`
          : "",
      action: step.kind === "renew" ? { href: renewHref(step.vehicle.id, step.policy.id), label: "Renew cover" } : undefined,
    },
    covered: {
      title: "You're covered",
      body:
        step.kind === "covered"
          ? `Policy #${step.policy.id}: ${formatUsdcUnits(step.policy.coverage, { whole: true })} cover, ${daysLeft(step.policy.endTime)} days left.`
          : "",
      action: step.kind === "covered" ? { href: `/dashboard/policies/${step.policy.id}`, label: "Proof of cover" } : undefined,
    },
  };
  const { title, body, action } = content[step.kind];

  return (
    <div className="animate-step-in relative overflow-hidden rounded-2xl border border-action/30 bg-gradient-to-br from-action/10 via-surface to-surface p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-action">Next step</p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="mt-1 max-w-xl text-sm text-ink-muted">{body}</p>
      {action && (
        <ButtonLink href={action.href} className="mt-5">
          {action.label}
        </ButtonLink>
      )}
    </div>
  );
}
