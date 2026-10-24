import type { Metadata } from "next";
import Link from "next/link";
import { PolicyCheck } from "./policy-check";

export const metadata: Metadata = {
  title: "Proof of cover",
  description: "Live proof of VehicleShield cover, confirmed on the blockchain.",
  robots: { index: false },
};

export default async function PolicyCheckPage({ params }: { params: Promise<{ policyId: string }> }) {
  const { policyId } = await params;
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-wider text-action">Proof of cover</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Policy #{policyId.replace(/\D/g, "").slice(0, 30)}</h1>
      <PolicyCheck policyId={policyId} />
      <p className="mt-8 text-center text-sm text-ink-muted">
        Checking another car?{" "}
        <Link href="/check" className="font-medium text-action hover:underline">
          Check by plate
        </Link>
      </p>
    </div>
  );
}
