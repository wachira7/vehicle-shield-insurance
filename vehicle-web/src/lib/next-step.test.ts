import { describe, expect, it } from "vitest";
import type { PolicySummary, Vehicle } from "./api";
import { daysLeft, nextStep } from "./next-step";

const vehicle = (overrides: Partial<Vehicle>): Vehicle => ({
  id: "v",
  plate: "KDA123A",
  vehicleId: "0x",
  make: "Toyota",
  model: "Axio",
  year: 2019,
  marketValueUsdc: "9000",
  mileageKm: 90000,
  condition: 7,
  accidentsLast3Years: 0,
  usage: "private",
  status: "pending",
  reviewNote: null,
  reviewedAt: null,
  createdAt: "",
  photos: [],
  missingViews: [],
  ...overrides,
});
const policy = (status: PolicySummary["status"]): PolicySummary => ({
  id: "1",
  vehicleId: "0x",
  coverage: "1",
  premium: "1",
  deductible: "1",
  paidOut: "0",
  startTime: "0",
  endTime: "9999999999", // far future, so active fixtures aren't in the renewal window
  status,
});

describe("nextStep", () => {
  it("starts with adding a vehicle", () => {
    expect(nextStep([], []).kind).toBe("add-vehicle");
  });

  it("asks for missing photos before anything else on a pending vehicle", () => {
    expect(nextStep([vehicle({ missingViews: ["front"] })], []).kind).toBe("finish-photos");
  });

  it("waits for review once photos are in", () => {
    expect(nextStep([vehicle({})], []).kind).toBe("in-review");
  });

  it("offers cover for a verified vehicle, and shows cover once active", () => {
    expect(nextStep([vehicle({ status: "verified" })], []).kind).toBe("buy-cover");
    expect(nextStep([vehicle({ status: "verified" })], [policy("active")]).kind).toBe("covered");
  });

  it("puts a rejected vehicle first", () => {
    expect(nextStep([vehicle({ status: "verified" }), vehicle({ status: "rejected" })], [policy("active")]).kind).toBe(
      "fix-vehicle",
    );
  });

  it("offers renewal, not a fresh purchase, when the car's cover has lapsed", () => {
    expect(nextStep([vehicle({ status: "verified" })], [policy("expired")])).toMatchObject({ kind: "renew", policy: { id: "1" } });
    expect(nextStep([vehicle({ status: "verified", vehicleId: "0xother" })], [policy("expired")]).kind).toBe("buy-cover");
  });

  it("reminds about renewal in the last 30 days of cover", () => {
    const now = 1_800_000_000_000;
    const ending = (days: number) => ({ ...policy("active"), endTime: String(now / 1000 + days * 86_400) });
    expect(nextStep([vehicle({ status: "verified" })], [ending(10)], [], now).kind).toBe("renew-soon");
    expect(nextStep([vehicle({ status: "verified" })], [ending(60)], [], now).kind).toBe("covered");
  });
});

describe("approved claims", () => {
  it("come first: there's money waiting", () => {
    const claim = { id: "3", status: "Approved" } as never;
    expect(nextStep([vehicle({ status: "rejected" })], [policy("active")], [claim]).kind).toBe("collect-payout");
    expect(nextStep([], [], [{ id: "4", status: "Paid" } as never]).kind).toBe("add-vehicle");
  });
});

describe("daysLeft", () => {
  it("rounds up and never goes negative", () => {
    const now = 1_000_000_000_000;
    expect(daysLeft(String(now / 1000 + 86_400 * 1.5), now)).toBe(2);
    expect(daysLeft(String(now / 1000 - 10), now)).toBe(0);
  });
});
