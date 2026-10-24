"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui";
import type { AssessorVehicle, ClaimRecord } from "@/lib/api";
import { useClaimWarningCount, useVehicleWarningCount } from "@/lib/assessor-queries";
import { formatUsdcUnits } from "@/lib/format";
import { waitingAge, type WaitTone } from "@/lib/queue";

const waitStyles: Record<WaitTone, string> = {
  ok: "bg-surface-2 text-ink-muted",
  warn: "bg-warn/15 text-warn",
  late: "bg-danger/15 text-danger",
};

/// How long something has waited, amber after 2 days and red after 5.
export function WaitBadge({ since }: { since: number }) {
  const { label, tone } = waitingAge(since);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${waitStyles[tone]}`} title="Waiting for a decision">
      <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}

function Warnings({ counts, loading }: { counts?: { danger: number; warn: number }; loading: boolean }) {
  if (loading) return <span className="h-5 w-16 animate-pulse rounded-full bg-surface-2" aria-label="Checking photos" />;
  if (!counts) return null;
  const total = counts.danger + counts.warn;
  if (!total) return <span className="text-xs text-ink-faint">No warnings</span>;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${counts.danger ? "bg-danger/15 text-danger" : "bg-warn/15 text-warn"}`}>
      {total} warning{total > 1 ? "s" : ""}
    </span>
  );
}

export function ClaimQueueRow({ claim }: { claim: Omit<ClaimRecord, "timeline"> }) {
  const warnings = useClaimWarningCount(claim.evidenceUri);
  return (
    <Link href={`/assessor/claims/${claim.id}`} className="block">
      <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2">
        <div className="min-w-0 space-y-1.5">
          <p className="font-medium">
            Claim #{claim.id} · {formatUsdcUnits(claim.requestedAmount, { whole: true })}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <span>Policy #{claim.policyId}</span>
            <WaitBadge since={Number(claim.submittedAt) * 1000} />
            <Warnings counts={warnings.data} loading={warnings.isPending} />
          </div>
        </div>
        <StatusBadge status={claim.status} />
      </Card>
    </Link>
  );
}

export function VehicleQueueRow({ vehicle }: { vehicle: AssessorVehicle }) {
  const complete = vehicle.missingViews.length === 0;
  const warnings = useVehicleWarningCount(vehicle.id);
  return (
    <Link href={`/assessor/vehicles/${vehicle.id}`} className="block">
      <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2">
        <div className="min-w-0 space-y-1.5">
          <p className="font-medium">
            <span className="font-mono">{vehicle.plate}</span> · {vehicle.make} {vehicle.model} {vehicle.year}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <WaitBadge since={new Date(vehicle.createdAt).getTime()} />
            {complete ? <Warnings counts={warnings.data} loading={warnings.isPending} /> : <span className="text-xs">Owner still adding photos</span>}
          </div>
        </div>
        <span className={`shrink-0 text-sm tabular-nums ${complete ? "text-action" : "text-ink-faint"}`}>{6 - vehicle.missingViews.length}/6 photos</span>
      </Card>
    </Link>
  );
}
