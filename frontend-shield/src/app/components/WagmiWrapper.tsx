'use client';

import { ReactNode, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/config/wagmi';

// Create the client outside of the component to avoid recreation on render
const queryClient = new QueryClient();

interface WagmiWrapperProps {
  children: ReactNode;
}

export function WagmiWrapper({ children }: WagmiWrapperProps) {
  // State to track if component is mounted on client
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set mounted to true once component is mounted on client
    setMounted(true);
    
    // This helps with development mode
    return () => {
      queryClient.clear();
    };
  }, []);

  // While not mounted on client yet, render a placeholder
  // You could also return null, but this helps maintain layout stability
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}