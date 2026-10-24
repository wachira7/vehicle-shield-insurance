"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider, type Config } from "wagmi";
import { Toaster } from "@/components/toast";
import { SessionProvider } from "@/lib/session";
import { appKitOptions, projectId, wagmiAdapter } from "@/lib/wallet";

// AppKit is created once per page load, and only where a project id is configured.
if (projectId) createAppKit(appKitOptions);

export default function WalletProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));

  if (!projectId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">Sign-in isn&apos;t configured</h1>
        <p className="mt-2 text-sm text-ink-muted">Set NEXT_PUBLIC_REOWN_PROJECT_ID to enable wallet and social sign-in.</p>
      </div>
    );
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <Toaster>{children}</Toaster>
        </SessionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
