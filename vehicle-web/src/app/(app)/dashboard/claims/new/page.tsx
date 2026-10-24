import type { Metadata } from "next";
import { Suspense } from "react";
import { ClaimForm } from "./claim-form";

export const metadata: Metadata = { title: "File a claim" };

export default function NewClaimPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse rounded-2xl bg-surface" />}>
      <ClaimForm />
    </Suspense>
  );
}
