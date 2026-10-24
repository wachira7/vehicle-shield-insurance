import type { PublicVehicle } from "@/lib/api";
import type { CoverStatus } from "@/lib/cover-status";
import { formatUsdcUnits } from "@/lib/format";

const day = (seconds: string) => new Date(Number(seconds) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/// The answer to "is this car covered?", as a big, glanceable panel.
export function CoverResult({
  status,
  vehicle,
  onChain,
}: {
  status: CoverStatus;
  vehicle: PublicVehicle | null;
  /// isPolicyActive read live from the contract: undefined while loading or unavailable.
  onChain?: boolean;
}) {
  const covered = status.kind === "covered" && onChain !== false;
  const heading =
    status.kind === "covered"
      ? onChain === false
        ? "Not covered"
        : "Covered"
      : status.kind === "upcoming"
        ? "Cover starts soon"
        : status.kind === "none"
          ? "No VehicleShield cover"
          : "Not covered";
  const detail =
    status.kind === "covered"
      ? `Until ${day(status.policy.endTime)}`
      : status.kind === "upcoming"
        ? `From ${day(status.policy.startTime)}`
        : status.kind === "expired"
          ? `Cover ended ${day(status.policy.endTime)}`
          : status.kind === "cancelled"
            ? "The last policy was cancelled"
            : "We have no policy for this car. It may be insured elsewhere.";

  return (
    <div
      className={`animate-step-in overflow-hidden rounded-2xl border ${covered ? "border-action/40 bg-gradient-to-br from-action/15 via-surface to-surface" : "border-line bg-surface"}`}
      role="status"
    >
      <div className="flex items-center gap-4 p-6">
        <span
          aria-hidden
          className={`grid size-14 shrink-0 place-items-center rounded-full text-2xl font-bold ${covered ? "bg-action text-action-ink" : status.kind === "none" ? "bg-surface-2 text-ink-muted" : "bg-danger/15 text-danger"}`}
        >
          {covered ? "✓" : status.kind === "none" ? "?" : "✕"}
        </span>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{heading}</p>
          <p className="text-ink-muted">{detail}</p>
        </div>
      </div>
      {(vehicle || status.kind !== "none") && (
        <dl className="grid grid-cols-2 gap-px border-t border-line bg-line text-sm">
          {vehicle && (
            <>
              <Cell label="Vehicle" value={`${vehicle.make} ${vehicle.model} ${vehicle.year}`} />
              <Cell label="Plate" value={<span className="font-mono">{vehicle.plate}</span>} />
            </>
          )}
          {status.kind !== "none" && (
            <>
              <Cell label="Policy" value={`#${status.policy.id}`} />
              <Cell label="Cover" value={formatUsdcUnits(status.policy.coverage, { whole: true })} />
            </>
          )}
        </dl>
      )}
      {status.kind !== "none" && (
        <p className="border-t border-line px-6 py-3 text-xs text-ink-faint">
          {onChain === undefined
            ? "Confirming on the blockchain…"
            : onChain
              ? "✓ Confirmed live on the blockchain just now."
              : "The blockchain reports this policy as not active."}
          {vehicle && " Compare the plate with the car in front of you."}
        </p>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-surface px-6 py-3">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
