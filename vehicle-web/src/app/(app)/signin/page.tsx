import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInFlow } from "./sign-in-flow";

export const metadata: Metadata = { title: "Sign in", description: "Sign in or create your VehicleShield account." };

export default function SignInPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-surface" />}>
        <SignInFlow />
      </Suspense>
      <p className="mt-6 text-center text-xs text-ink-faint">
        VehicleShield is on the Sepolia test network. Nothing you do here moves real money.
      </p>
    </div>
  );
}
