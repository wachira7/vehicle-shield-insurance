// Pure helpers shared by the event handlers and the API, kept free of Ponder imports so
// they can be unit-tested directly.

export const CLAIM_STATUSES = ["Submitted", "UnderReview", "Approved", "Rejected", "Paid"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/// Maps InsuranceCore.ClaimStatus (0 = None, 1 = Submitted, ...) to its name.
export function claimStatusName(value: number): ClaimStatus {
  const name = CLAIM_STATUSES[value - 1];
  if (!name) throw new Error(`Unknown claim status ${value}`);
  return name;
}

/// Parses `?status=Submitted,UnderReview`; undefined means "any status", null means invalid.
export function parseClaimStatuses(query: string | undefined): ClaimStatus[] | undefined | null {
  if (query === undefined || query === "") return undefined;
  const names = query.split(",").map((name) => name.trim());
  return names.every((name): name is ClaimStatus => (CLAIM_STATUSES as readonly string[]).includes(name)) ? names : null;
}

export type PolicyStatus = "active" | "upcoming" | "expired" | "cancelled";

/// Mirrors InsuranceCore.isPolicyActive: active from startTime (inclusive) to endTime (exclusive).
export function policyStatus(
  policy: { startTime: bigint; endTime: bigint; cancelled: boolean },
  nowSeconds: bigint,
): PolicyStatus {
  if (policy.cancelled) return "cancelled";
  if (nowSeconds < policy.startTime) return "upcoming";
  if (nowSeconds >= policy.endTime) return "expired";
  return "active";
}

export interface PoolTotals {
  policiesSold: number;
  policiesCancelled: number;
  premiumsCollected: bigint;
  refundsPaid: bigint;
  claimsSubmitted: number;
  claimsApproved: number;
  claimsRejected: number;
  claimsPaid: number;
  payoutsTotal: bigint;
  poolFunded: bigint;
  poolWithdrawn: bigint;
}

export const EMPTY_TOTALS: PoolTotals = {
  policiesSold: 0,
  policiesCancelled: 0,
  premiumsCollected: 0n,
  refundsPaid: 0n,
  claimsSubmitted: 0,
  claimsApproved: 0,
  claimsRejected: 0,
  claimsPaid: 0,
  payoutsTotal: 0n,
  poolFunded: 0n,
  poolWithdrawn: 0n,
};

/// Adds a partial set of increments to running totals.
export function addTotals(totals: PoolTotals, delta: Partial<PoolTotals>): PoolTotals {
  const next = { ...totals } as Record<keyof PoolTotals, number | bigint>;
  for (const [key, value] of Object.entries(delta) as [keyof PoolTotals, number | bigint][]) {
    next[key] = typeof value === "bigint" ? (next[key] as bigint) + value : (next[key] as number) + value;
  }
  return next as unknown as PoolTotals;
}
