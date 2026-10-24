"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PhotoCapture } from "@/components/photo-capture";
import { Steps } from "@/components/steps";
import { ButtonLink, Card } from "@/components/ui";
import { VehicleForm, emptyVehicle, toVehicleInput, type VehicleFormValues } from "@/components/vehicle-form";
import { ApiError, submitVehicle, type Vehicle } from "@/lib/api";
import { readLastQuote } from "@/lib/last-quote";
import { useSession } from "@/lib/session";

export default function NewVehiclePage() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [initial, setInitial] = useState<VehicleFormValues | null>(null);

  // Start from the details of the last quote, if there is one.
  useEffect(() => setInitial({ ...emptyVehicle, ...readLastQuote() }), []);

  const save = async (values: VehicleFormValues) => {
    setBusy(true);
    setError(undefined);
    try {
      setVehicle(await submitVehicle(token!, toVehicleInput(values)));
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.body.error === "already_verified"
          ? "This car is already verified on your account."
          : "We couldn't save your car. Check the details and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const step = submitted ? 2 : vehicle ? 1 : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Add a vehicle</h1>
        <p className="mt-1 text-ink-muted">Two quick steps, then an assessor checks everything.</p>
      </header>
      <Steps steps={["Details", "Photos", "Review"]} current={step} />

      <Card key={step} className="animate-step-in">
        {step === 0 && initial && (
          <>
            <h2 className="mb-5 text-lg font-semibold">Your car</h2>
            <VehicleForm initial={initial} submitLabel="Continue to photos" busy={busy} serverError={error} onSubmit={save} />
          </>
        )}
        {step === 1 && vehicle && (
          <>
            <h2 className="text-lg font-semibold">Six photos of your car</h2>
            <p className="mb-5 mt-1 text-sm text-ink-muted">
              In daylight if you can. On a phone, each tile opens the camera. Photos are encrypted before they&apos;re
              stored.
            </p>
            <PhotoCapture vehicle={vehicle} onChange={setVehicle} />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={vehicle.missingViews.length > 0}
                onClick={() => setSubmitted(true)}
                className="inline-flex items-center justify-center rounded-xl bg-action px-5 py-3 text-sm font-semibold text-action-ink transition-colors hover:bg-action/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit for review
              </button>
              {vehicle.missingViews.length > 0 && (
                <p className="text-sm text-ink-faint">Add all six photos to continue. You can also finish later from Vehicles.</p>
              )}
            </div>
          </>
        )}
        {step === 2 && vehicle && (
          <div className="py-6 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-action/15 text-2xl text-action">✓</span>
            <h2 className="mt-4 text-xl font-semibold">Submitted for review</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              An assessor will check your {vehicle.make} {vehicle.model}&apos;s photos and details. You&apos;ll see the
              result on your dashboard. If anything needs changing, they&apos;ll say exactly what.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/dashboard">Back to dashboard</ButtonLink>
              <ButtonLink href={`/dashboard/vehicles/${vehicle.id}`} variant="secondary">
                View vehicle
              </ButtonLink>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
