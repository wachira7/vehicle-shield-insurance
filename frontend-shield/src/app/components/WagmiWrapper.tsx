'use client';

import { ReactNode, useEffect, useState, memo } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/config/wagmi';

// Create the client outside of the component
const queryClient = new QueryClient();

// This is a trick to ensure this component only runs on the client
const NoSSRWrapper = ({ children }: { children: ReactNode }) => {
  // State to track hydration
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Return a placeholder with the same DOM structure to avoid hydration errors
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <>{children}</>;
};

// Memoize to prevent unnecessary re-renders
const MemoizedNoSSR = memo(NoSSRWrapper);

export function WagmiWrapper({ children }: { children: ReactNode }) {
  // Use optional chaining to check if window is defined (client-side only)
  const isBrowser = typeof window !== 'undefined';
  
  if (!isBrowser) {
    // Return early if we're not in a browser
    return <>{children}</>;
  }

  return (
    <MemoizedNoSSR>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </MemoizedNoSSR>
  );
}