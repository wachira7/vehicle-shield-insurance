//src/app/components/WagmiWrapper.tsx
'use client';

import { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/config/wagmi';
import { Loader2 } from 'lucide-react';

interface WagmiWrapperProps {
  children: React.ReactNode;
}

// Create a client
const queryClient = new QueryClient();

export function WagmiWrapper({ children }: WagmiWrapperProps) {
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to handle hydration
  useEffect(() => {
    try {
      // Debug Wagmi config
      console.log('Initializing WagmiWrapper with config:', {
        chains: config.chains.map(c => c.name),
        connectors: config.connectors.map(c => c.name),
      });
      
      // Set hydrated after initial render
      setHydrated(true);
    } catch (err) {
      console.error('Error initializing WagmiWrapper:', err);
      setError(err instanceof Error ? err.message : 'Unknown error initializing wallet connections');
    }
  }, []);

  // Show loading state until hydration is complete
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg">Loading wallet connections...</span>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="border border-red-200 bg-red-50 p-4 rounded-lg max-w-md text-center">
          <h3 className="text-red-800 text-lg font-medium mb-2">
            Wallet Connection Error
          </h3>
          <p className="text-red-700">
            {error}
          </p>
          <div className="mt-4">
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render the providers with children
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default WagmiWrapper;