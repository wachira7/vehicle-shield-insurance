"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useIsAssessor } from "@/lib/queries";

/// The customer area. Assessor accounts are sent to their console instead: staff don't hold
/// insurance from the account they assess claims with (the API refuses it too).
export function CustomerOnly({ children }: { children: ReactNode }) {
  const assessor = useIsAssessor();
  const router = useRouter();
  useEffect(() => {
    if (assessor.data) router.replace("/assessor");
  }, [assessor.data, router]);

  // If the role can't be checked, customers still get in; the API enforces the rule anyway.
  if (assessor.isPending || assessor.data) return <div className="h-64 animate-pulse rounded-2xl bg-surface" aria-label="Loading" />;
  return <>{children}</>;
}
