"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { useIsAssessor } from "@/lib/queries";

/// Shows its children only to wallets holding ASSESSOR_ROLE. The API enforces the same rule;
/// this just avoids showing a console that can't load.
export function RequireAssessor({ children }: { children: ReactNode }) {
  const assessor = useIsAssessor();
  if (assessor.isPending) return <div className="h-64 animate-pulse rounded-2xl bg-surface" aria-label="Loading" />;
  if (assessor.isError) {
    return (
      <Card>
        <p className="font-medium">We couldn&apos;t check your assessor access.</p>
        <button onClick={() => assessor.refetch()} className="mt-2 text-sm font-medium text-action hover:underline">
          Try again
        </button>
      </Card>
    );
  }
  if (!assessor.data) {
    return (
      <Card className="py-12 text-center">
        <p className="text-lg font-semibold">For assessors only</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
          This wallet doesn&apos;t hold the assessor role. Sign in with an assessor&apos;s wallet to review vehicles and claims.
        </p>
      </Card>
    );
  }
  return <>{children}</>;
}
