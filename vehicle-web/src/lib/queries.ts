"use client";

import { useQuery } from "@tanstack/react-query";
import { listPolicies, listVehicles } from "./api";
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
