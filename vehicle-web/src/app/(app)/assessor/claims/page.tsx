"use client";

import { ClaimQueueRow } from "@/components/queue-rows";
import { Card } from "@/components/ui";
import { useOpenClaims } from "@/lib/assessor-queries";

export default function ClaimQueue() {
  const claims = useOpenClaims();
  return (
    <div className="space-y-6">
      <header className="animate-step-in">
        <h1 className="text-3xl font-semibold tracking-tight">Claims</h1>
        <p className="mt-1 text-ink-muted">Open claims, oldest first. Each shows how long it has waited and whether its photos raise questions.</p>
      </header>
      {claims.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : claims.isError ? (
        <Card className="text-sm text-ink-muted">The claims queue couldn&apos;t be loaded. It retries on its own.</Card>
      ) : claims.data.length ? (
        <ul className="space-y-3">
          {claims.data.map((claim) => (
            <li key={claim.id} className="animate-step-in">
              <ClaimQueueRow claim={claim} />
            </li>
          ))}
        </ul>
      ) : (
        <Card className="py-14 text-center">
          <p className="text-lg font-semibold">All caught up</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            When a customer files a claim it appears here within seconds, with its photos checked and ready to compare.
          </p>
        </Card>
      )}
    </div>
  );
}
