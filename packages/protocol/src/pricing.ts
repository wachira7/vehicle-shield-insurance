// Premium pricing for vehicle policies. Pure and deterministic: the same inputs always give
// the same price, and every factor is returned so the UI can explain the premium.
// Amounts are USDC base units (6 decimals); factors are basis points (10_000 = 1.0x).

export const PRICING_VERSION = "2026-10-v1";

const BPS = 10_000n;
const ONE_USDC = 1_000_000n;
const ONE_CENT = 10_000n;

export const PRICING_LIMITS = {
  baseAnnualRateBps: 400n, // 4% of coverage per year before factors
  minPremium: 10n * ONE_USDC,
  minCoverage: 200n * ONE_USDC,
  maxVehicleValue: 250_000n * ONE_USDC,
  minDeductible: 50n * ONE_USDC,
  maxDeductibleBps: 2_000n, // 20% of coverage
  minDurationDays: 30,
  maxDurationDays: 365,
  maxVehicleAge: 25,
  minCondition: 3,
  maxAccidents: 3,
  maxMileageKm: 1_000_000,
} as const;

export type VehicleUsage = "private" | "commercial";

export interface VehicleProfile {
  year: number;
  marketValue: bigint;
  mileageKm: number;
  condition: number; // 1 (poor) to 10 (as new)
  accidentsLast3Years: number;
  usage: VehicleUsage;
}

export interface CoverageRequest {
  coverage: bigint;
  deductible: bigint;
  durationDays: number;
}

export interface PriceFactor {
  name: string;
  multiplierBps: number;
  reason: string;
}

export type PricingResult =
  | {
      eligible: true;
      premium: bigint;
      annualPremium: bigint;
      factors: PriceFactor[];
      pricingVersion: string;
    }
  | { eligible: false; reasons: string[]; pricingVersion: string };

export function priceQuote(vehicle: VehicleProfile, request: CoverageRequest, now = new Date()): PricingResult {
  const L = PRICING_LIMITS;
  const age = Math.max(0, now.getUTCFullYear() - vehicle.year);
  const reasons: string[] = [];

  if (!Number.isInteger(vehicle.condition) || vehicle.condition < 1 || vehicle.condition > 10) {
    reasons.push("Condition must be a whole number from 1 to 10.");
  } else if (vehicle.condition < L.minCondition) {
    reasons.push(`Vehicles in condition below ${L.minCondition}/10 need an inspection before we can cover them.`);
  }
  if (vehicle.year > now.getUTCFullYear() + 1) reasons.push("The model year is in the future.");
  if (age > L.maxVehicleAge) reasons.push(`Vehicles older than ${L.maxVehicleAge} years aren't covered yet.`);
  if (vehicle.mileageKm < 0 || vehicle.mileageKm > L.maxMileageKm) reasons.push("Mileage is out of range.");
  if (vehicle.accidentsLast3Years > L.maxAccidents) {
    reasons.push(`More than ${L.maxAccidents} accidents in the last 3 years can't be covered online.`);
  }
  if (vehicle.marketValue > L.maxVehicleValue) reasons.push("The vehicle's value is above our current limit of 250,000 USDC.");
  if (request.coverage < L.minCoverage || request.coverage > vehicle.marketValue) {
    reasons.push("Coverage must be at least 200 USDC and no more than the vehicle's value.");
  }
  if (request.deductible < L.minDeductible || request.deductible * BPS > request.coverage * L.maxDeductibleBps) {
    reasons.push("The deductible must be at least 50 USDC and at most 20% of the coverage.");
  }
  if (
    !Number.isInteger(request.durationDays) ||
    request.durationDays < L.minDurationDays ||
    request.durationDays > L.maxDurationDays
  ) {
    reasons.push(`Policies run from ${L.minDurationDays} to ${L.maxDurationDays} days.`);
  }
  if (reasons.length) return { eligible: false, reasons, pricingVersion: PRICING_VERSION };

  const factors: PriceFactor[] = [
    ageFactor(age),
    mileageFactor(vehicle.mileageKm),
    {
      name: "Condition",
      multiplierBps: 10_000 + (7 - vehicle.condition) * 500,
      reason: `Rated ${vehicle.condition}/10`,
    },
    accidentFactor(vehicle.accidentsLast3Years),
    vehicle.usage === "commercial"
      ? { name: "Usage", multiplierBps: 13_500, reason: "Commercial use" }
      : { name: "Usage", multiplierBps: 10_000, reason: "Private use" },
    deductibleFactor(request.deductible, request.coverage),
  ];

  let annualPremium = (request.coverage * L.baseAnnualRateBps) / BPS;
  for (const factor of factors) annualPremium = (annualPremium * BigInt(factor.multiplierBps)) / BPS;

  let premium = (annualPremium * BigInt(request.durationDays)) / 365n;
  if (request.durationDays < 90) {
    const shortTerm = { name: "Short term", multiplierBps: 11_500, reason: "Policies under 90 days" };
    factors.push(shortTerm);
    premium = (premium * BigInt(shortTerm.multiplierBps)) / BPS;
  }

  premium = roundUpToCent(premium);
  if (premium < L.minPremium) premium = L.minPremium;

  return {
    eligible: true,
    premium,
    annualPremium: roundUpToCent(annualPremium),
    factors,
    pricingVersion: PRICING_VERSION,
  };
}

function ageFactor(age: number): PriceFactor {
  const reason = `${age} year${age === 1 ? "" : "s"} old`;
  if (age <= 3) return { name: "Vehicle age", multiplierBps: 10_000, reason };
  if (age <= 7) return { name: "Vehicle age", multiplierBps: 11_000, reason };
  if (age <= 12) return { name: "Vehicle age", multiplierBps: 12_500, reason };
  return { name: "Vehicle age", multiplierBps: 14_000, reason };
}

function mileageFactor(km: number): PriceFactor {
  const reason = `${km.toLocaleString("en-US")} km`;
  if (km < 50_000) return { name: "Mileage", multiplierBps: 9_500, reason };
  if (km < 150_000) return { name: "Mileage", multiplierBps: 10_000, reason };
  if (km < 250_000) return { name: "Mileage", multiplierBps: 11_000, reason };
  return { name: "Mileage", multiplierBps: 12_000, reason };
}

function accidentFactor(accidents: number): PriceFactor {
  const multipliers = [9_000, 12_500, 15_000, 18_000];
  const reason = accidents === 0 ? "No accidents in 3 years" : `${accidents} accident${accidents === 1 ? "" : "s"} in 3 years`;
  return { name: "Claims history", multiplierBps: multipliers[accidents], reason };
}

function deductibleFactor(deductible: bigint, coverage: bigint): PriceFactor {
  const shareBps = Number((deductible * BPS) / coverage);
  return {
    name: "Deductible",
    multiplierBps: 10_000 - Math.min(2_500, shareBps),
    reason: `${(shareBps / 100).toFixed(1)}% of coverage paid by you per claim`,
  };
}

function roundUpToCent(amount: bigint): bigint {
  return ((amount + ONE_CENT - 1n) / ONE_CENT) * ONE_CENT;
}
