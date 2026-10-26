import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { RequireSession } from "@/components/require-session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your details" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-16 h-80 w-full max-w-md animate-pulse rounded-2xl bg-surface" />}>
      <AuthShell>
        <RequireSession>
          <ProfileForm />
        </RequireSession>
      </AuthShell>
    </Suspense>
  );
}
