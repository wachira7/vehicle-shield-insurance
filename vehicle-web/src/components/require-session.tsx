"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session";

/// Shows its children only with a signed-in session; otherwise sends the visitor to sign in
/// and back here afterwards.
export function RequireSession({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "signed-out") router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  return status === "signed-in" ? <>{children}</> : (fallback ?? <PageSkeleton />);
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse space-y-4 px-4 py-12" aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-surface" />
      <div className="h-40 rounded-2xl bg-surface" />
      <div className="h-24 rounded-2xl bg-surface" />
    </div>
  );
}
