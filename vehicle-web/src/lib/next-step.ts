import type { ClaimRecord, PolicySummary, Vehicle } from "./api";

export type NextStep =
  | { kind: "add-vehicle" }
  | { kind: "finish-photos"; vehicle: Vehicle }
  | { kind: "in-review"; vehicle: Vehicle }
  | { kind: "fix-vehicle"; vehicle: Vehicle }
  | { kind: "buy-cover"; vehicle: Vehicle }
  | { kind: "covered"; policy: PolicySummary }
  | { kind: "collect-payout"; claim: ClaimRecord };

/// The single most useful thing to do next, in order of urgency.
export function nextStep(vehicles: Vehicle[], policies: PolicySummary[], claims: ClaimRecord[] = []): NextStep {
  const approved = claims.find((claim) => claim.status === "Approved");
  if (approved) return { kind: "collect-payout", claim: approved };
  const active = policies.find((policy) => policy.status === "active");
  const rejected = vehicles.find((vehicle) => vehicle.status === "rejected");
  if (rejected) return { kind: "fix-vehicle", vehicle: rejected };
  const unfinished = vehicles.find((vehicle) => vehicle.status === "pending" && vehicle.missingViews.length > 0);
  if (unfinished) return { kind: "finish-photos", vehicle: unfinished };
  if (active) return { kind: "covered", policy: active };
  const verified = vehicles.find((vehicle) => vehicle.status === "verified");
  if (verified) return { kind: "buy-cover", vehicle: verified };
  const reviewing = vehicles.find((vehicle) => vehicle.status === "pending");
  if (reviewing) return { kind: "in-review", vehicle: reviewing };
  return { kind: "add-vehicle" };
}

export function daysLeft(endTime: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((Number(endTime) * 1000 - now) / 86_400_000));
}
