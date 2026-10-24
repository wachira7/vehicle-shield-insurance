import { describe, expect, it } from "vitest";
import { coverBounds, deductibleOptions, formatCountdown, renewalTerms } from "./cover-options";

describe("coverBounds", () => {
  it("caps cover at the car's value and suggests about 80%", () => {
    expect(coverBounds(15_000)).toEqual({ min: 200, max: 15_000, suggested: 12_000 });
    expect(coverBounds(9_050)).toEqual({ min: 200, max: 9_000, suggested: 7_200 });
  });
});

describe("deductibleOptions", () => {
  it("offers about 5, 10 and 15% of the cover in $50 steps", () => {
    expect(deductibleOptions(12_000)).toEqual([600, 1_200, 1_800]);
  });

  it("never goes below $50 or above 20% of the cover, and has no duplicates", () => {
    for (const cover of [200, 300, 500, 1_000, 7_250, 250_000]) {
      const options = deductibleOptions(cover);
      expect(options.length).toBeGreaterThan(0);
      expect(new Set(options).size).toBe(options.length);
      for (const option of options) {
        expect(option).toBeGreaterThanOrEqual(50);
        expect(option).toBeLessThanOrEqual(Math.max(50, cover * 0.2));
      }
    }
  });
});

describe("formatCountdown", () => {
  it("shows minutes and seconds", () => {
    expect(formatCountdown(14 * 60_000 + 5_000)).toBe("14:05");
    expect(formatCountdown(-5)).toBe("0:00");
  });
});

describe("renewalTerms", () => {
  it("keeps the same terms when they're still valid", () => {
    expect(renewalTerms({ cover: 7200, deductible: 700, durationDays: 365 }, 9000)).toEqual({ cover: 7200, deductible: 700, durationDays: 365 });
  });

  it("fits the cover to the car's current value and snaps to offered options", () => {
    const terms = renewalTerms({ cover: 12_000, deductible: 777, durationDays: 364 }, 9000);
    expect(terms.cover).toBe(9000);
    expect(deductibleOptions(9000)).toContain(terms.deductible);
    expect(terms.durationDays).toBe(365);
  });
});
