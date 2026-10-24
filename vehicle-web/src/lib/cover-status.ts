// What a public cover check should say about a car, from its policies (newest first).
import type { PolicySummary } from "./api";

export type CoverStatus =
  | { kind: "covered"; policy: PolicySummary }
  | { kind: "upcoming"; policy: PolicySummary }
  | { kind: "expired"; policy: PolicySummary }
  | { kind: "cancelled"; policy: PolicySummary }
  | { kind: "none" };

export function coverStatus(policies: PolicySummary[]): CoverStatus {
  const active = policies.find((policy) => policy.status === "active");
  if (active) return { kind: "covered", policy: active };
  const upcoming = policies.find((policy) => policy.status === "upcoming");
  if (upcoming) return { kind: "upcoming", policy: upcoming };
  const latest = [...policies].sort((a, b) => Number(b.id) - Number(a.id))[0];
  if (!latest) return { kind: "none" };
  return { kind: latest.status === "cancelled" ? "cancelled" : "expired", policy: latest };
}
