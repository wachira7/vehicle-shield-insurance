import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireSession } from "@/components/require-session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Your details" };

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-20">
      <RequireSession>
        <Suspense>
          <ProfileForm />
        </Suspense>
      </RequireSession>
    </div>
  );
}
