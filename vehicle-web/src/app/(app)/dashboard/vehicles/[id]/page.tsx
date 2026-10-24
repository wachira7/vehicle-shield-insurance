"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { PhotoCapture } from "@/components/photo-capture";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast";
import { ButtonLink, Card } from "@/components/ui";
import { VehicleForm, toVehicleInput, type VehicleFormValues } from "@/components/vehicle-form";
import { submitVehicle } from "@/lib/api";
import { formatUsd } from "@/lib/format";
import { latestPolicyFor } from "@/lib/next-step";
import { usePolicies, useVehicles } from "@/lib/queries";
import { renewHref } from "@/lib/renewal";
import { useSession } from "@/lib/session";

export default function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const vehicles = useVehicles();
  const policies = usePolicies();
  const { token } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const vehicle = vehicles.data?.find((v) => v.id === id);

  if (vehicles.isPending) return <div className="h-64 animate-pulse rounded-2xl bg-surface" />;
  if (!vehicle) {
    return (
      <Card className="py-12 text-center">
        <p className="font-semibold">Vehicle not found</p>
        <Link href="/dashboard/vehicles" className="mt-2 inline-block text-sm text-action hover:underline">
          Back to vehicles
        </Link>
      </Card>
    );
  }

  const latest = latestPolicyFor(policies.data ?? [], vehicle.vehicleId);
  const covered = latest && (latest.status === "active" || latest.status === "upcoming");

  const resubmit = async (values: VehicleFormValues) => {
    setBusy(true);
    try {
      await submitVehicle(token!, toVehicleInput(values));
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast("Sent for review again");
    } catch {
      toast("We couldn't resubmit. Try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/dashboard/vehicles" className="text-sm text-ink-muted hover:text-ink">
        ← Vehicles
      </Link>
      <header className="animate-step-in flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {vehicle.make} {vehicle.model}
          </h1>
          <p className="mt-1 font-mono text-ink-muted">{vehicle.plate}</p>
        </div>
        <StatusBadge status={vehicle.status} />
      </header>

      {vehicle.status === "rejected" && (
        <Card className="border-danger/30">
          <p className="font-semibold">The assessor asked for a change</p>
          <p className="mt-1 text-sm text-ink-muted">{vehicle.reviewNote ?? "Please check your details and photos."}</p>
        </Card>
      )}
      {vehicle.status === "verified" && (
        <Card className="border-action/30">
          <p className="font-semibold">Verified</p>
          <p className="mt-1 text-sm text-ink-muted">
            {vehicle.reviewNote ? `Assessor's note: ${vehicle.reviewNote}. ` : ""}Your price uses these confirmed
            details.
          </p>
          {covered ? (
            <ButtonLink href={`/dashboard/policies/${latest.id}`} variant="secondary" className="mt-4">
              Covered by policy #{latest.id}
            </ButtonLink>
          ) : (
            <ButtonLink href={latest ? renewHref(vehicle.id, latest.id) : `/dashboard/vehicles/${vehicle.id}/buy`} className="mt-4">
              {latest ? "Renew cover" : "Buy cover"}
            </ButtonLink>
          )}
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">Details</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          {[
            ["Year", vehicle.year],
            ["Worth", formatUsd(vehicle.marketValueUsdc, { whole: true })],
            ["Mileage", `${vehicle.mileageKm.toLocaleString("en-US")} km`],
            ["Condition", `${vehicle.condition}/10`],
            ["Accidents (3 yrs)", vehicle.accidentsLast3Years],
            ["Use", vehicle.usage === "private" ? "Private" : "Business"],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-ink-faint">{label}</dt>
              <dd className="mt-0.5 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Photos</h2>
        <PhotoCapture key={vehicle.photos.map((p) => p.id).join()} vehicle={vehicle} />
      </Card>

      {vehicle.status === "rejected" && (
        <Card>
          <h2 className="mb-5 font-semibold">Update and resubmit</h2>
          <VehicleForm
            initial={{
              plate: vehicle.plate,
              make: vehicle.make,
              model: vehicle.model,
              year: String(vehicle.year),
              marketValue: String(Math.round(Number(vehicle.marketValueUsdc))),
              mileageKm: String(vehicle.mileageKm),
              condition: vehicle.condition,
              accidents: Math.min(vehicle.accidentsLast3Years, 3),
              usage: vehicle.usage,
            }}
            submitLabel="Resubmit for review"
            busy={busy}
            onSubmit={resubmit}
          />
        </Card>
      )}
    </div>
  );
}
