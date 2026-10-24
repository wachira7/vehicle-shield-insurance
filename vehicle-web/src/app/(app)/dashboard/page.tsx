"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { VehicleRow } from "@/components/vehicle-row";
import { ButtonLink, Card } from "@/components/ui";
import { formatUsdcUnits } from "@/lib/format";
import { daysLeft, nextStep, type NextStep } from "@/lib/next-step";
import { usePolicies, useVehicles } from "@/lib/queries";
import { useSession } from "@/lib/session";

export default function DashboardHome() {
  const { profile } = useSession();
  const vehicles = useVehicles();
  const policies = usePolicies();
  const loading = vehicles.isPending || policies.isPending;
  const firstName = profile?.fullName.split(" ")[0];

  return (
    <div className="space-y-8">
      <header className="animate-step-in">
        <h1 className="text-3xl font-semibold tracking-tight">{firstName ? `Hi, ${firstName}` : "Your dashboard"}</h1>
        <p className="mt-1 text-ink-muted">Your cover, vehicles and claims in one place.</p>
      </header>

      {loading ? (
        <div className="h-36 animate-pulse rounded-2xl bg-surface" aria-label="Loading" />
      ) : vehicles.isError ? (
        <Card>
          <p className="font-medium">We couldn&apos;t load your vehicles.</p>
          <button onClick={() => vehicles.refetch()} className="mt-2 text-sm font-medium text-action hover:underline">
            Try again
          </button>
        </Card>
      ) : (
        <NextStepCard step={nextStep(vehicles.data ?? [], policies.data ?? [])} />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="vehicles-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="vehicles-heading" className="font-semibold">
              Vehicles
            </h2>
            <Link href="/dashboard/vehicles" className="text-sm text-ink-muted hover:text-ink">
              See all
            </Link>
          </div>
          {vehicles.isPending ? (
            <div className="h-24 animate-pulse rounded-2xl bg-surface" />
          ) : vehicles.data?.length ? (
            <ul className="space-y-3">
              {vehicles.data.slice(0, 3).map((vehicle) => (
                <li key={vehicle.id}>
                  <VehicleRow vehicle={vehicle} />
                </li>
              ))}
            </ul>
          ) : (
            <Card className="text-sm text-ink-muted">No vehicles yet. Add one to get covered.</Card>
          )}
        </section>

        <section aria-labelledby="cover-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="cover-heading" className="font-semibold">
              Cover
            </h2>
            <Link href="/dashboard/policies" className="text-sm text-ink-muted hover:text-ink">
              See all
            </Link>
          </div>
          {policies.isPending ? (
            <div className="h-24 animate-pulse rounded-2xl bg-surface" />
          ) : policies.data === null ? (
            <Card className="text-sm text-ink-muted">Policy details are unavailable right now.</Card>
          ) : policies.data?.length ? (
            <ul className="space-y-3">
              {policies.data.slice(0, 3).map((policy) => (
                <li key={policy.id}>
                  <Link href={`/dashboard/policies`} className="block">
                    <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-surface-2">
                      <div>
                        <p className="font-medium">Policy #{policy.id}</p>
                        <p className="text-sm text-ink-muted">{formatUsdcUnits(policy.coverage, { whole: true })} cover</p>
                      </div>
                      <StatusBadge status={policy.status} />
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Card className="text-sm text-ink-muted">No policies yet. Verify a vehicle to buy cover.</Card>
          )}
        </section>
      </div>
    </div>
  );
}

function NextStepCard({ step }: { step: NextStep }) {
  const content: Record<NextStep["kind"], { title: string; body: string; action?: { href: string; label: string } }> = {
    "add-vehicle": {
      title: "Verify your first car",
      body: "Add your car's details and six photos. An assessor checks them, then you can buy cover.",
      action: { href: "/dashboard/vehicles/new", label: "Add a vehicle" },
    },
    "finish-photos": {
      title: "Finish your photos",
      body:
        step.kind === "finish-photos"
          ? `${6 - step.vehicle.missingViews.length} of 6 photos added for your ${step.vehicle.make} ${step.vehicle.model}.`
          : "",
      action: step.kind === "finish-photos" ? { href: `/dashboard/vehicles/${step.vehicle.id}`, label: "Add the rest" } : undefined,
    },
    "in-review": {
      title: "Your car is being reviewed",
      body: "An assessor is checking your photos and details. We'll show the result here.",
    },
    "fix-vehicle": {
      title: "Your car needs a change",
      body: step.kind === "fix-vehicle" && step.vehicle.reviewNote ? `Assessor's note: ${step.vehicle.reviewNote}` : "See what the assessor asked for.",
      action: step.kind === "fix-vehicle" ? { href: `/dashboard/vehicles/${step.vehicle.id}`, label: "See details" } : undefined,
    },
    "buy-cover": {
      title: "Your car is verified",
      body: "You can now buy cover at a price based on the details the assessor confirmed. Buying opens in the next update.",
    },
    covered: {
      title: "You're covered",
      body:
        step.kind === "covered"
          ? `Policy #${step.policy.id}: ${formatUsdcUnits(step.policy.coverage, { whole: true })} cover, ${daysLeft(step.policy.endTime)} days left.`
          : "",
      action: { href: "/dashboard/policies", label: "View policy" },
    },
  };
  const { title, body, action } = content[step.kind];

  return (
    <div className="animate-step-in relative overflow-hidden rounded-2xl border border-action/30 bg-gradient-to-br from-action/10 via-surface to-surface p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-action">Next step</p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="mt-1 max-w-xl text-sm text-ink-muted">{body}</p>
      {action && (
        <ButtonLink href={action.href} className="mt-5">
          {action.label}
        </ButtonLink>
      )}
    </div>
  );
}
