import { describe, expect, it } from "vitest";
import type { PolicySummary } from "./api";
import { coverStatus } from "./cover-status";

const policy = (id: string, status: PolicySummary["status"]): PolicySummary => ({
  id,
  status,
  vehicleId: "0x",
  coverage: "1",
  premium: "1",
  deductible: "0",
  paidOut: "0",
  startTime: "0",
  endTime: "0",
});

describe("coverStatus", () => {
  it("is covered when any policy is active, whatever came before", () => {
    expect(coverStatus([policy("3", "active"), policy("2", "cancelled")])).toMatchObject({ kind: "covered", policy: { id: "3" } });
  });

  it("reports the latest lapsed policy otherwise", () => {
    expect(coverStatus([policy("2", "cancelled"), policy("5", "expired")])).toMatchObject({ kind: "expired", policy: { id: "5" } });
    expect(coverStatus([policy("7", "cancelled"), policy("5", "expired")])).toMatchObject({ kind: "cancelled", policy: { id: "7" } });
  });

  it("knows cover that hasn't started and cars never insured", () => {
    expect(coverStatus([policy("4", "upcoming")]).kind).toBe("upcoming");
    expect(coverStatus([]).kind).toBe("none");
  });
});
