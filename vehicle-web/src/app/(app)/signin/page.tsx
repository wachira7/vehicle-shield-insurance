import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { SignInFlow } from "./sign-in-flow";

export const metadata: Metadata = { title: "Sign in", description: "Sign in or create your VehicleShield account." };

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-16 h-80 w-full max-w-md animate-pulse rounded-2xl bg-surface" />}>
      <AuthShell>
        <SignInFlow />
        <p className="mt-6 text-center text-xs text-ink-faint">
          VehicleShield is on the Sepolia test network. Nothing you do here moves real money.
        </p>
      </AuthShell>
    </Suspense>
  );
}
