"use client";

import { useQuery } from "@tanstack/react-query";
import { CoverResult } from "@/components/cover-result";
import { fetchPolicyDetail, getPublicVehicle } from "@/lib/api";
import { coverStatus } from "@/lib/cover-status";
import { isPolicyActiveOnChain } from "@/lib/public-chain";
import { QueryProvider } from "../query-provider";

export function PolicyCheck({ policyId }: { policyId: string }) {
  return (
    <QueryProvider>
      <Check policyId={policyId} />
    </QueryProvider>
  );
}

function Check({ policyId }: { policyId: string }) {
  const valid = /^\d{1,30}$/.test(policyId);
  const policy = useQuery({ queryKey: ["public-policy", policyId], queryFn: () => fetchPolicyDetail(policyId), enabled: valid });
  const vehicle = useQuery({
    queryKey: ["public-vehicle", policy.data?.vehicleId],
    queryFn: () => getPublicVehicle(policy.data!.vehicleId),
    enabled: Boolean(policy.data),
  });
  const onChain = useQuery({ queryKey: ["public-check-chain", policyId], queryFn: () => isPolicyActiveOnChain(policyId), enabled: valid });

  if (!valid) return <p className="mt-6 text-ink-muted">That isn&apos;t a policy number.</p>;
  if (policy.isPending) return <div className="mt-6 h-48 animate-pulse rounded-2xl bg-surface" aria-label="Checking" />;
  if (!policy.data) {
    return (
      <p role="alert" className="mt-6 rounded-xl border border-line bg-surface p-4 text-sm text-ink-muted">
        We couldn&apos;t find this policy. Check the number, or try again in a moment.
      </p>
    );
  }
  // Ask about this exact policy, not the car's latest one.
  const status = coverStatus([policy.data]);
  return (
    <div className="mt-6">
      <CoverResult status={status} vehicle={vehicle.data ?? null} onChain={onChain.isError ? undefined : onChain.data} />
    </div>
  );
}
