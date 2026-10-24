import type { Metadata } from "next";
import { Suspense } from "react";
import { CoverCheck } from "./cover-check";

export const metadata: Metadata = {
  title: "Check cover",
  description: "Check whether a car has active VehicleShield cover by its number plate, confirmed live on the blockchain.",
};

export default function CheckPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Is this car covered?</h1>
      <p className="mt-2 text-ink-muted">Enter a number plate. The answer comes straight from the blockchain, so anyone can trust it.</p>
      <Suspense>
        <CoverCheck />
      </Suspense>
    </div>
  );
}
