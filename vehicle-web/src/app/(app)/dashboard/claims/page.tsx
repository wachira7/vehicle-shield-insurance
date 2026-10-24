"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { ButtonLink, Card } from "@/components/ui";
import { formatUsdcUnits } from "@/lib/format";
import { useClaims, usePolicies } from "@/lib/queries";

export default function ClaimsPage() {
  const policies = usePolicies();
  const claims = useClaims();
  const hasActive = (policies.data ?? []).some((p) => p.status === "active");

  return (
    <div className="space-y-6">
      <header className="animate-step-in flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Claims</h1>
          <p className="mt-1 text-ink-muted">File a claim and follow every step until it&apos;s paid.</p>
        </div>
        {hasActive && <ButtonLink href="/dashboard/claims/new">File a claim</ButtonLink>}
      </header>

      {policies.isPending || (policies.isSuccess && claims.isPending) ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : claims.data?.length ? (
        <ul className="space-y-3">
          {claims.data.map((claim) => (
            <li key={claim.id} className="animate-step-in">
              <Link href={`/dashboard/claims/${claim.id}`} className="block">
                <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2">
                  <div>
                    <p className="font-medium">
                      Claim #{claim.id} · {formatUsdcUnits(claim.requestedAmount, { whole: true })}
                    </p>
                    <p className="text-sm text-ink-muted">
                      Policy #{claim.policyId} · filed{" "}
                      {new Date(Number(claim.submittedAt) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <StatusBadge status={claim.status} />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="py-12 text-center">
          <p className="text-lg font-semibold">No claims</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            {hasActive
              ? "If something happens to your car, file a claim here with photos of the damage. You'll see each step until it's paid."
              : "With an active policy, you'll file claims here with photos of the damage, then track the review and payout."}
          </p>
          <ButtonLink href={hasActive ? "/dashboard/claims/new" : "/dashboard/policies"} variant={hasActive ? "primary" : "secondary"} className="mt-6">
            {hasActive ? "File a claim" : "View policies"}
          </ButtonLink>
        </Card>
      )}
    </div>
  );
}
