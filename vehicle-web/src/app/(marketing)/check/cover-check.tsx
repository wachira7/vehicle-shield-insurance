"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CoverResult } from "@/components/cover-result";
import { Button } from "@/components/ui";
import { ApiError, checkPlate, listPoliciesForVehicle } from "@/lib/api";
import { coverStatus } from "@/lib/cover-status";
import { isPolicyActiveOnChain } from "@/lib/public-chain";
import { QueryProvider } from "./query-provider";

export function CoverCheck() {
  return (
    <QueryProvider>
      <Check />
    </QueryProvider>
  );
}

function Check() {
  const router = useRouter();
  const params = useSearchParams();
  const plate = params.get("plate") ?? "";
  const [input, setInput] = useState(plate);

  const result = useQuery({
    queryKey: ["public-check", plate.replace(/\s+/g, "").toUpperCase()],
    queryFn: async () => {
      const { vehicleId, vehicle } = await checkPlate(plate);
      const status = coverStatus(await listPoliciesForVehicle(vehicleId));
      return { vehicle, status };
    },
    enabled: Boolean(plate),
    retry: false,
  });
  const policyId = result.data && result.data.status.kind !== "none" ? result.data.status.policy.id : undefined;
  const onChain = useQuery({
    queryKey: ["public-check-chain", policyId],
    queryFn: () => isPolicyActiveOnChain(policyId!),
    enabled: Boolean(policyId),
  });

  const valid = /^[A-Za-z0-9 -]{2,15}$/.test(input.trim());

  return (
    <div className="mt-8 space-y-6">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) router.replace(`/check?plate=${encodeURIComponent(input.trim().toUpperCase())}`);
        }}
      >
        <label htmlFor="plate" className="sr-only">
          Number plate
        </label>
        <input
          id="plate"
          value={input}
          onChange={(event) => setInput(event.target.value.toUpperCase().slice(0, 15))}
          placeholder="KCX 456B"
          autoCapitalize="characters"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 font-mono text-lg tracking-wider outline-none focus:border-action"
        />
        <Button type="submit" disabled={!valid || result.isFetching}>
          {result.isFetching ? "Checking…" : "Check"}
        </Button>
      </form>

      {result.isFetching ? (
        <div className="h-48 animate-pulse rounded-2xl bg-surface" aria-label="Checking" />
      ) : result.isError ? (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
          {result.error instanceof ApiError && result.error.status === 429
            ? "Too many checks from this connection. Try again in a minute."
            : "The check couldn't be completed right now. Please try again."}
        </p>
      ) : result.data ? (
        <CoverResult status={result.data.status} vehicle={result.data.vehicle} onChain={onChain.isError ? undefined : onChain.data} />
      ) : null}
    </div>
  );
}
