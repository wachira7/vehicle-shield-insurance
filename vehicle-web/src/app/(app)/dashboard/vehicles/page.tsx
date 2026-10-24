"use client";

import { ButtonLink, Card } from "@/components/ui";
import { VehicleRow } from "@/components/vehicle-row";
import { useVehicles } from "@/lib/queries";

export default function VehiclesPage() {
  const vehicles = useVehicles();
  return (
    <div className="space-y-6">
      <header className="animate-step-in flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Vehicles</h1>
          <p className="mt-1 text-ink-muted">Cars you&apos;ve added for verification.</p>
        </div>
        <ButtonLink href="/dashboard/vehicles/new">Add a vehicle</ButtonLink>
      </header>
      {vehicles.isPending ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : vehicles.isError ? (
        <Card>
          <p className="font-medium">We couldn&apos;t load your vehicles.</p>
          <button onClick={() => vehicles.refetch()} className="mt-2 text-sm font-medium text-action hover:underline">
            Try again
          </button>
        </Card>
      ) : vehicles.data.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-lg font-semibold">No vehicles yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Add your car&apos;s details and six photos. Once an assessor verifies it, you can buy cover.
          </p>
          <ButtonLink href="/dashboard/vehicles/new" className="mt-6">
            Add your first vehicle
          </ButtonLink>
        </Card>
      ) : (
        <ul className="space-y-3">
          {vehicles.data.map((vehicle) => (
            <li key={vehicle.id} className="animate-step-in">
              <VehicleRow vehicle={vehicle} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
