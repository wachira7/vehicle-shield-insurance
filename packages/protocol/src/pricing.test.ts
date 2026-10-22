import { describe, expect, it } from "vitest";
import { PRICING_LIMITS, priceQuote, type CoverageRequest, type VehicleProfile } from "./pricing";

const USDC = (n: number) => BigInt(Math.round(n * 1_000_000));
const NOW = new Date("2026-06-01T00:00:00Z");

const vehicle: VehicleProfile = {
  year: 2022,
  marketValue: USDC(20_000),
  mileageKm: 60_000,
  condition: 8,
  accidentsLast3Years: 0,
  usage: "private",
};
const request: CoverageRequest = { coverage: USDC(15_000), deductible: USDC(750), durationDays: 365 };

function premiumOf(v: Partial<VehicleProfile> = {}, r: Partial<CoverageRequest> = {}) {
  const result = priceQuote({ ...vehicle, ...v }, { ...request, ...r }, NOW);
  if (!result.eligible) throw new Error(result.reasons.join(" "));
  return result.premium;
}

describe("priceQuote", () => {
  it("prices the reference vehicle exactly", () => {
    // 15,000 x 4% = 600, x1.10 age, x1.00 mileage, x0.95 condition, x0.90 no claims,
    // x1.00 private, x0.95 deductible = 536.085, rounded up to 536.09
    const result = priceQuote(vehicle, request, NOW);
    expect(result.eligible).toBe(true);
    if (!result.eligible) return;
    expect(result.premium).toBe(USDC(536.09));
    expect(result.annualPremium).toBe(USDC(536.09));
    expect(result.factors.map((f) => [f.name, f.multiplierBps])).toEqual([
      ["Vehicle age", 11_000],
      ["Mileage", 10_000],
      ["Condition", 9_500],
      ["Claims history", 9_000],
      ["Usage", 10_000],
      ["Deductible", 9_500],
    ]);
  });

  it("charges more for riskier profiles", () => {
    const base = premiumOf();
    expect(premiumOf({ accidentsLast3Years: 1 })).toBeGreaterThan(base);
    expect(premiumOf({ usage: "commercial" })).toBeGreaterThan(base);
    expect(premiumOf({ year: 2010 })).toBeGreaterThan(base);
    expect(premiumOf({ mileageKm: 260_000 })).toBeGreaterThan(base);
    expect(premiumOf({ condition: 4 })).toBeGreaterThan(base);
    expect(premiumOf({}, { coverage: USDC(18_000) })).toBeGreaterThan(base);
  });

  it("charges less for a higher deductible or a shorter term", () => {
    const base = premiumOf();
    expect(premiumOf({}, { deductible: USDC(3_000) })).toBeLessThan(base);
    expect(premiumOf({}, { durationDays: 180 })).toBeLessThan(base);
  });

  it("loads policies shorter than 90 days", () => {
    const result = priceQuote(vehicle, { ...request, durationDays: 60 }, NOW);
    if (!result.eligible) throw new Error("expected eligible");
    expect(result.factors.at(-1)).toMatchObject({ name: "Short term", multiplierBps: 11_500 });
    const proRata = (result.annualPremium * 60n) / 365n;
    expect(result.premium).toBeGreaterThan(proRata);
  });

  it("applies the minimum premium", () => {
    expect(premiumOf({}, { coverage: USDC(500), deductible: USDC(50), durationDays: 30 })).toBe(
      PRICING_LIMITS.minPremium,
    );
  });

  it.each([
    ["too old", { year: 1999 }, {}],
    ["poor condition", { condition: 2 }, {}],
    ["invalid condition", { condition: 11 }, {}],
    ["too many accidents", { accidentsLast3Years: 4 }, {}],
    ["too valuable", { marketValue: USDC(300_000) }, { coverage: USDC(250_000) }],
    ["coverage above value", {}, { coverage: USDC(25_000) }],
    ["coverage too small", {}, { coverage: USDC(100) }],
    ["deductible too low", {}, { deductible: USDC(10) }],
    ["deductible too high", {}, { deductible: USDC(4_000) }],
    ["term too long", {}, { durationDays: 400 }],
    ["term too short", {}, { durationDays: 7 }],
    ["future model year", { year: 2030 }, {}],
  ] as const)("declines: %s", (_, v, r) => {
    const result = priceQuote({ ...vehicle, ...v }, { ...request, ...r }, NOW);
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("collects every reason at once", () => {
    const result = priceQuote({ ...vehicle, condition: 2, accidentsLast3Years: 5 }, { ...request, durationDays: 7 }, NOW);
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.reasons).toHaveLength(3);
  });

  it("keeps every eligible premium positive, whole cents and below coverage", () => {
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
      return seed % n;
    };
    for (let i = 0; i < 500; i++) {
      const value = USDC(1_000 + rand(200_000));
      const coverage = USDC(200) + (value - USDC(200)) * BigInt(rand(101)) / 100n;
      const maxDeductible = (coverage * 2_000n) / 10_000n;
      const deductible = USDC(50) + ((maxDeductible > USDC(50) ? maxDeductible - USDC(50) : 0n) * BigInt(rand(101))) / 100n;
      const result = priceQuote(
        {
          year: 2001 + rand(26),
          marketValue: value,
          mileageKm: rand(400_000),
          condition: 3 + rand(8),
          accidentsLast3Years: rand(4),
          usage: rand(2) ? "private" : "commercial",
        },
        { coverage, deductible, durationDays: 30 + rand(336) },
        NOW,
      );
      if (!result.eligible) {
        // Only small policies can fail here: the deductible floor exceeds 20% of coverage.
        expect(coverage).toBeLessThan(USDC(250));
        continue;
      }
      expect(result.premium).toBeGreaterThanOrEqual(PRICING_LIMITS.minPremium);
      expect(result.premium % 10_000n).toBe(0n);
      expect(result.premium).toBeLessThan(coverage);
    }
  });
});
