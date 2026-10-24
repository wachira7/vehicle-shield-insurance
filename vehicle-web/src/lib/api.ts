// Calls to the quote API (vehicle-api) and the indexer (vehicle-indexer).

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
export const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:42069";

export interface VehicleInput {
  year: number;
  marketValueUsdc: number;
  mileageKm: number;
  condition: number;
  accidentsLast3Years: number;
  usage: "private" | "commercial";
}

export interface EstimateInput {
  vehicle: VehicleInput;
  coverageUsdc: number;
  deductibleUsdc: number;
  durationDays: number;
}

export interface PriceFactor {
  name: string;
  reason: string;
  multiplier: number;
}

export interface Estimate {
  premiumUsdc: string;
  annualPremiumUsdc: string;
  factors: PriceFactor[];
  pricingVersion: string;
}

export type EstimateResult =
  | { kind: "priced"; estimate: Estimate }
  | { kind: "declined"; reasons: string[] }
  | { kind: "error"; message: string };

export async function estimateQuote(input: EstimateInput, signal?: AbortSignal): Promise<EstimateResult> {
  try {
    const response = await fetch(`${API_URL}/v1/quotes/estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    const body = await response.json();
    if (response.ok) return { kind: "priced", estimate: body };
    if (response.status === 422) return { kind: "declined", reasons: body.reasons };
    if (response.status === 400) return { kind: "error", message: "Check the highlighted details and try again." };
    return { kind: "error", message: "We couldn't price this right now. Please try again." };
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    return { kind: "error", message: "We couldn't reach the pricing service. Check your connection and try again." };
  }
}

export interface PoolStats {
  policiesSold: number;
  premiumsCollected: string;
  claimsPaid: number;
  payoutsTotal: string;
  poolFunded: string;
  poolWithdrawn: string;
  refundsPaid: string;
}

/// Pool totals for the public stats; null when the indexer is unreachable.
export async function fetchPoolStats(): Promise<PoolStats | null> {
  try {
    const response = await fetch(`${INDEXER_URL}/v1/stats`, { next: { revalidate: 30 } });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

/// USDC currently backing claims: funding + premiums − refunds − payouts − withdrawals.
export function poolBalanceUnits(stats: PoolStats): bigint {
  return (
    BigInt(stats.poolFunded) +
    BigInt(stats.premiumsCollected) -
    BigInt(stats.refundsPaid) -
    BigInt(stats.payoutsTotal) -
    BigInt(stats.poolWithdrawn)
  );
}
