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
  endTime: "0",
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

  it("ignores policies that aren't active", () => {
    expect(nextStep([vehicle({ status: "verified" })], [policy("expired")]).kind).toBe("buy-cover");
  });
});

describe("daysLeft", () => {
  it("rounds up and never goes negative", () => {
    const now = 1_000_000_000_000;
    expect(daysLeft(String(now / 1000 + 86_400 * 1.5), now)).toBe(2);
    expect(daysLeft(String(now / 1000 - 10), now)).toBe(0);
  });
});
