"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPolicyDetail, listPolicies, listVehicles } from "./api";
import { useSession } from "./session";

export function useVehicles() {
  const { token, address } = useSession();
  return useQuery({
    queryKey: ["vehicles", address],
    queryFn: async () => (await listVehicles(token!)).vehicles,
    enabled: Boolean(token),
  });
}

/// Policies held by the signed-in wallet; null when the indexer can't be reached.
export function usePolicies() {
  const { address } = useSession();
  return useQuery({
    queryKey: ["policies", address],
    queryFn: () => listPolicies(address!),
    enabled: Boolean(address),
  });
}

/// Every claim on the signed-in wallet's policies, newest first. Refreshes regularly so
/// status changes (review, approval, payout) appear without reloading.
export function useClaims() {
  const policies = usePolicies();
  const ids = (policies.data ?? []).map((policy) => policy.id);
  return useQuery({
    queryKey: ["claims", ids],
    queryFn: async () => {
      const details = await Promise.all(ids.map((id) => fetchPolicyDetail(id)));
      return details
        .flatMap((detail) => detail?.claims ?? [])
        .sort((a, b) => Number(b.id) - Number(a.id));
    },
    enabled: policies.isSuccess,
    refetchInterval: 15_000,
  });
}
