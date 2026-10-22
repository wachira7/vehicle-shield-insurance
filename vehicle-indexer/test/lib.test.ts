import { describe, expect, it } from "vitest";
import { EMPTY_TOTALS, addTotals, claimStatusName, policyStatus } from "../src/lib";

describe("claimStatusName", () => {
  it("maps the contract's enum values", () => {
    expect([1, 2, 3, 4, 5].map(claimStatusName)).toEqual(["Submitted", "UnderReview", "Approved", "Rejected", "Paid"]);
  });

  it("rejects None and unknown values", () => {
    expect(() => claimStatusName(0)).toThrow();
    expect(() => claimStatusName(6)).toThrow();
  });
});

describe("policyStatus", () => {
  const policy = { startTime: 100n, endTime: 200n, cancelled: false };

  it("matches the contract's active window", () => {
    expect(policyStatus(policy, 99n)).toBe("upcoming");
    expect(policyStatus(policy, 100n)).toBe("active");
    expect(policyStatus(policy, 199n)).toBe("active");
    expect(policyStatus(policy, 200n)).toBe("expired");
  });

  it("reports cancellation over everything else", () => {
    expect(policyStatus({ ...policy, cancelled: true }, 150n)).toBe("cancelled");
  });
});

describe("addTotals", () => {
  it("adds counts and amounts without touching other fields", () => {
    const once = addTotals(EMPTY_TOTALS, { policiesSold: 1, premiumsCollected: 432_670_000n });
    const twice = addTotals(once, { policiesSold: 1, premiumsCollected: 100n });
    expect(twice.policiesSold).toBe(2);
    expect(twice.premiumsCollected).toBe(432_670_100n);
    expect(twice.claimsPaid).toBe(0);
    expect(EMPTY_TOTALS.policiesSold).toBe(0);
  });
});
