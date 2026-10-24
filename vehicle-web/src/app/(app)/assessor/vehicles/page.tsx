"use client";

import { VehicleQueueRow } from "@/components/queue-rows";
import { Card } from "@/components/ui";
import { usePendingVehicles } from "@/lib/assessor-queries";

export default function VehicleQueue() {
  const vehicles = usePendingVehicles();
  const ready = (vehicles.data ?? []).filter((vehicle) => vehicle.missingViews.length === 0);
  const waiting = (vehicles.data ?? []).filter((vehicle) => vehicle.missingViews.length > 0);
  return (
    <div className="space-y-8">
      <header className="animate-step-in">
        <h1 className="text-3xl font-semibold tracking-tight">Vehicles</h1>
        <p className="mt-1 text-ink-muted">Cars waiting for verification, oldest first. Customers can buy cover once you verify them.</p>
      </header>
      {vehicles.isPending ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : vehicles.isError ? (
        <Card className="text-sm text-ink-muted">The vehicle queue couldn&apos;t be loaded. It retries on its own.</Card>
      ) : (
        <>
          <section aria-labelledby="ready-heading">
            <h2 id="ready-heading" className="mb-3 font-semibold">
              Ready to verify <span className="font-normal text-ink-faint">({ready.length})</span>
            </h2>
            {ready.length ? (
              <ul className="space-y-3">
                {ready.map((vehicle) => (
                  <li key={vehicle.id} className="animate-step-in">
                    <VehicleQueueRow vehicle={vehicle} />
                  </li>
                ))}
              </ul>
            ) : (
              <Card className="py-10 text-center text-sm text-ink-muted">No cars ready. Ones with all six photos appear here.</Card>
            )}
          </section>
          {waiting.length > 0 && (
            <section aria-labelledby="waiting-heading">
              <h2 id="waiting-heading" className="mb-1 font-semibold">
                Owner still adding photos <span className="font-normal text-ink-faint">({waiting.length})</span>
              </h2>
              <p className="mb-3 text-sm text-ink-muted">Nothing to do yet; they move up once all six photos are in.</p>
              <ul className="space-y-3 opacity-80">
                {waiting.map((vehicle) => (
                  <li key={vehicle.id}>
                    <VehicleQueueRow vehicle={vehicle} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
