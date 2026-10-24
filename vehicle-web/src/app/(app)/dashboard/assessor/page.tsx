"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui";
import { listClaims, listVehiclesForReview } from "@/lib/api";
import { formatUsdcUnits } from "@/lib/format";
import { useSession } from "@/lib/session";

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const ago = (date: Date) => {
  const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  return hours < 1 ? "just now" : hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
};

export default function AssessorQueue() {
  const { token } = useSession();
  const claims = useQuery({
    queryKey: ["assessor", "claims"],
    queryFn: () => listClaims(["Submitted", "UnderReview"]),
    refetchInterval: 15_000,
  });
  const vehicles = useQuery({
    queryKey: ["assessor", "vehicles"],
    queryFn: async () => (await listVehiclesForReview(token!)).vehicles,
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-8">
      <header className="animate-step-in">
        <h1 className="text-3xl font-semibold tracking-tight">Assessor console</h1>
        <p className="mt-1 text-ink-muted">Oldest first. Each review shows the photos beside the insured car, with anything worth a second look.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Queue
          title="Claims to decide"
          count={claims.data?.length}
          loading={claims.isPending}
          error={claims.isError ? "We couldn't reach the indexer." : undefined}
          empty="No open claims. New ones appear here within seconds."
        >
          {claims.data?.map((claim) => (
            <li key={claim.id} className="animate-step-in">
              <Link href={`/dashboard/assessor/claims/${claim.id}`} className="block">
                <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      Claim #{claim.id} · {formatUsdcUnits(claim.requestedAmount, { whole: true })}
                    </p>
                    <p className="truncate text-sm text-ink-muted">
                      Policy #{claim.policyId} · filed {ago(new Date(Number(claim.submittedAt) * 1000))}
                    </p>
                  </div>
                  <StatusBadge status={claim.status} />
                </Card>
              </Link>
            </li>
          ))}
        </Queue>

        <Queue
          title="Vehicles to verify"
          count={vehicles.data?.length}
          loading={vehicles.isPending}
          error={vehicles.isError ? "We couldn't load the vehicle queue." : undefined}
          empty="No vehicles waiting for verification."
        >
          {vehicles.data?.map((vehicle) => (
            <li key={vehicle.id} className="animate-step-in">
              <Link href={`/dashboard/assessor/vehicles/${vehicle.id}`} className="block">
                <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <span className="font-mono">{vehicle.plate}</span> · {vehicle.make} {vehicle.model} {vehicle.year}
                    </p>
                    <p className="truncate text-sm text-ink-muted">
                      {short(vehicle.owner)} · {ago(new Date(vehicle.createdAt))}
                    </p>
                  </div>
                  <span className={`text-sm tabular-nums ${vehicle.missingViews.length ? "text-ink-faint" : "text-action"}`}>
                    {6 - vehicle.missingViews.length}/6 photos
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </Queue>
      </div>
    </div>
  );
}

function Queue({
  title,
  count,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  count?: number;
  loading: boolean;
  error?: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        {title}
        {count !== undefined && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums text-ink-muted">{count}</span>}
      </h2>
      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : error ? (
        <Card className="text-sm text-ink-muted">{error}</Card>
      ) : count ? (
        <ul className="space-y-3">{children}</ul>
      ) : (
        <Card className="py-10 text-center text-sm text-ink-muted">{empty}</Card>
      )}
    </section>
  );
}
