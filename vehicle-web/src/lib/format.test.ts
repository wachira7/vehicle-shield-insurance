import { describe, expect, it } from "vitest";
import { describeMultiplier, formatUsd, formatUsdcUnits, perMonth } from "./format";

describe("money formatting", () => {
  it("shows dollars", () => {
    expect(formatUsd("536.09")).toBe("$536.09");
    expect(formatUsd(12000)).toBe("$12,000.00");
    expect(formatUsd(12000, { whole: true })).toBe("$12,000");
  });

  it("converts USDC base units exactly", () => {
    expect(formatUsdcUnits("536090000")).toBe("$536.09");
    expect(formatUsdcUnits(100_432_670_000n, { whole: true })).toBe("$100,433");
    expect(formatUsdcUnits("1")).toBe("$0.00");
    expect(formatUsdcUnits("0")).toBe("$0.00");
  });

  it("never understates the monthly price", () => {
    expect(perMonth("536.09")).toBe("$44.68");
    expect(perMonth("120.00")).toBe("$10.00");
  });
});

describe("describeMultiplier", () => {
  it("reads as a percentage change", () => {
    expect(describeMultiplier(1.1)).toBe("+10%");
    expect(describeMultiplier(0.95)).toBe("−5%");
    expect(describeMultiplier(1.35)).toBe("+35%");
    expect(describeMultiplier(1)).toBe("No change");
  });
});
