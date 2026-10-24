"use client";

import { StatusBadge } from "@/components/status-badge";
import { ButtonLink, Card } from "@/components/ui";
import { formatUsdcUnits } from "@/lib/format";
import { daysLeft } from "@/lib/next-step";
import { usePolicies } from "@/lib/queries";

export default function PoliciesPage() {
  const policies = usePolicies();
  return (
    <div className="space-y-6">
      <header className="animate-step-in">
        <h1 className="text-3xl font-semibold tracking-tight">Policies</h1>
        <p className="mt-1 text-ink-muted">Your cover, read live from the blockchain.</p>
      </header>
      {policies.isPending ? (
        <div className="h-28 animate-pulse rounded-2xl bg-surface" />
      ) : policies.data === null ? (
        <Card className="text-sm text-ink-muted">Policy details are unavailable right now. Please try again shortly.</Card>
      ) : policies.data?.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {policies.data.map((policy) => (
            <li key={policy.id} className="animate-step-in">
              <Card>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Policy #{policy.id}</p>
                  <StatusBadge status={policy.status} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-ink-faint">Cover</dt>
                    <dd className="font-medium tabular-nums">{formatUsdcUnits(policy.coverage, { whole: true })}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">Deductible</dt>
                    <dd className="font-medium tabular-nums">{formatUsdcUnits(policy.deductible, { whole: true })}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">{policy.status === "active" ? "Days left" : "Paid out"}</dt>
                    <dd className="font-medium tabular-nums">
                      {policy.status === "active" ? daysLeft(policy.endTime) : formatUsdcUnits(policy.paidOut, { whole: true })}
                    </dd>
                  </div>
                </dl>
                {policy.status === "active" && (
                  <ButtonLink href={`/dashboard/claims/new?policy=${policy.id}`} variant="secondary" className="mt-5 w-full">
                    File a claim
                  </ButtonLink>
                )}
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="py-12 text-center">
          <p className="text-lg font-semibold">No policies yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">Once a vehicle is verified, you can buy cover for it here.</p>
          <ButtonLink href="/dashboard/vehicles" className="mt-6">
            Go to vehicles
          </ButtonLink>
        </Card>
      )}
    </div>
  );
}
