"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ButtonLink, Card } from "@/components/ui";
import { renewalTerms } from "@/lib/cover-options";
import { latestPolicyFor } from "@/lib/next-step";
import { usePolicies, useVehicles } from "@/lib/queries";
import { BuyFlow } from "./buy-flow";

const day = (seconds: string) => new Date(Number(seconds) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function BuyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const search = useSearchParams();
  const vehicles = useVehicles();
  const policies = usePolicies();
  const vehicle = vehicles.data?.find((v) => v.id === id);

  if (vehicles.isPending || policies.isPending) return <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-2xl bg-surface" />;
  if (!vehicle || vehicle.status !== "verified") {
    return (
      <Card className="mx-auto max-w-2xl py-12 text-center">
        <p className="font-semibold">{vehicle ? "This car isn't verified yet" : "Vehicle not found"}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
          {vehicle ? "Cover can be bought once an assessor has verified it." : "It may belong to a different account."}
        </p>
        <Link href="/dashboard/vehicles" className="mt-4 inline-block text-sm text-action hover:underline">
          Back to vehicles
        </Link>
      </Card>
    );
  }

  // One active policy per car: the contract would refuse a second, so say so up front.
  const current = latestPolicyFor(policies.data ?? [], vehicle.vehicleId);
  if (current && (current.status === "active" || current.status === "upcoming")) {
    return (
      <Card className="mx-auto max-w-2xl py-12 text-center">
        <p className="text-lg font-semibold">This car is already covered</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
          Policy #{current.id} runs until {day(current.endTime)}. You can renew from that day, and we&apos;ll keep the same terms ready for you.
        </p>
        <ButtonLink href={`/dashboard/policies/${current.id}`} className="mt-6">
          View policy
        </ButtonLink>
      </Card>
    );
  }

  const renewing = (policies.data ?? []).find((p) => p.id === search.get("renew") && p.vehicleId.toLowerCase() === vehicle.vehicleId.toLowerCase());
  const initial = renewing
    ? renewalTerms(
        {
          cover: Number(renewing.coverage) / 1e6,
          deductible: Number(renewing.deductible) / 1e6,
          durationDays: Math.round((Number(renewing.endTime) - Number(renewing.startTime)) / 86_400),
        },
        Number(vehicle.marketValueUsdc),
      )
    : undefined;
  return <BuyFlow vehicle={vehicle} initial={initial} renewingPolicyId={renewing?.id} />;
}
