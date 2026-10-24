"use client";

// Data for the assessor console. Queues refresh on their own; warning counts are cached, since
// a claim's photos don't change once filed.
import { useQuery } from "@tanstack/react-query";
import { getClaimReview, getVehicleForReview, listClaims, listDecisions, listMyVehicleDecisions, listVehiclesForReview } from "./api";
import { claimWarnings, vehicleWarnings, type FlagText } from "./flags";
import { formatUsdcUnits } from "./format";
import type { Decision } from "./queue";
import { useSession } from "./session";

export function useOpenClaims() {
  return useQuery({ queryKey: ["assessor", "claims"], queryFn: () => listClaims(["Submitted", "UnderReview"]), refetchInterval: 15_000 });
}

export function usePendingVehicles() {
  const { token } = useSession();
  return useQuery({
    queryKey: ["assessor", "vehicles"],
    queryFn: async () => (await listVehiclesForReview(token!)).vehicles,
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });
}

const countWarnings = (flags: FlagText[]) => ({
  danger: flags.filter((flag) => flag.tone === "danger").length,
  warn: flags.filter((flag) => flag.tone === "warn").length,
});

export function useClaimWarningCount(evidenceUri: string) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["assessor", "review", evidenceUri],
    queryFn: () => getClaimReview(token!, evidenceUri),
    select: (review) => countWarnings(claimWarnings(review)),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  });
}

export function useVehicleWarningCount(vehicleId: string) {
  const { token } = useSession();
  return useQuery({
    queryKey: ["assessor", "vehicle", vehicleId],
    queryFn: () => getVehicleForReview(token!, vehicleId),
    select: (vehicle) => countWarnings(vehicleWarnings(vehicle)),
    enabled: Boolean(token),
    staleTime: 60_000,
  });
}

export interface HistoryItem extends Decision {
  id: string;
  title: string;
  outcome: "approved" | "declined" | "verified" | "sent back";
  detail: string;
  href: string;
  txHash?: string;
}

/// This assessor's own decisions on claims (from the chain) and vehicles (from the API), newest first.
export function useMyDecisions() {
  const { token, address } = useSession();
  return useQuery({
    queryKey: ["assessor", "history", address],
    enabled: Boolean(token && address),
    refetchInterval: 30_000,
    queryFn: async (): Promise<HistoryItem[]> => {
      const [claims, verified, rejected] = await Promise.all([
        listDecisions(address!),
        listMyVehicleDecisions(token!, "verified"),
        listMyVehicleDecisions(token!, "rejected"),
      ]);
      const claimItems = claims.map((decision): HistoryItem => ({
        id: `claim-${decision.claimId}-${decision.txHash}`,
        kind: "claim",
        decidedAt: Number(decision.timestamp) * 1000,
        arrivedAt: Number(decision.claim?.submittedAt ?? decision.timestamp) * 1000,
        title: `Claim #${decision.claimId}`,
        outcome: decision.status === "Approved" ? "approved" : "declined",
        detail: decision.claim
          ? decision.status === "Approved"
            ? `${formatUsdcUnits(decision.claim.approvedAmount ?? "0")} of ${formatUsdcUnits(decision.claim.requestedAmount)} approved`
            : (decision.claim.rejectionReason ?? "Declined")
          : "",
        href: `/assessor/claims/${decision.claimId}`,
        txHash: decision.txHash,
      }));
      const vehicleItems = [...verified.vehicles, ...rejected.vehicles].map((vehicle): HistoryItem => ({
        id: `vehicle-${vehicle.id}`,
        kind: "vehicle",
        decidedAt: new Date(vehicle.reviewedAt ?? vehicle.createdAt).getTime(),
        arrivedAt: new Date(vehicle.createdAt).getTime(),
        title: `${vehicle.plate} · ${vehicle.make} ${vehicle.model}`,
        outcome: vehicle.status === "verified" ? "verified" : "sent back",
        detail: vehicle.reviewNote ?? (vehicle.status === "verified" ? "Verified as submitted" : ""),
        href: `/assessor/vehicles/${vehicle.id}`,
      }));
      return [...claimItems, ...vehicleItems].sort((a, b) => b.decidedAt - a.decidedAt);
    },
  });
}
