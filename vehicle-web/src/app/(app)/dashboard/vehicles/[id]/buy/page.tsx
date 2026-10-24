"use client";

import { use } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { useVehicles } from "@/lib/queries";
import { BuyFlow } from "./buy-flow";

export default function BuyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const vehicles = useVehicles();
  const vehicle = vehicles.data?.find((v) => v.id === id);

  if (vehicles.isPending) return <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-2xl bg-surface" />;
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
  return <BuyFlow vehicle={vehicle} />;
}
