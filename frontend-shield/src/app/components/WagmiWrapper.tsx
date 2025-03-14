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

// Define types for Ethereum providers
interface EthereumProvider {
  isMetaMask?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: EthereumProvider[];
}

// Helper function to safely access the ethereum provider
const getEthereumProvider = (): EthereumProvider | null => {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  return window.ethereum as unknown as EthereumProvider;
};

export function WagmiWrapper({ children }: WagmiWrapperProps) {
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to detect wallet conflicts
  const detectWalletConflicts = () => {
    const ethereum = getEthereumProvider();
    if (!ethereum) return;
    
    // Debug provider info
    console.log('Current ethereum provider:', {
      isMetaMask: ethereum.isMetaMask,
      isCoinbaseWallet: ethereum.isCoinbaseWallet,
      isTrust: ethereum.isTrust || ethereum.isTrustWallet,
      hasProviders: Boolean(ethereum.providers?.length)
    });
    
    // Check if we have multiple providers
    if (ethereum.providers?.length) {
      console.log('Multiple wallet providers detected:', ethereum.providers.length);
      console.log('Available providers:', ethereum.providers.map(p => ({
        isMetaMask: p.isMetaMask,
        isCoinbaseWallet: p.isCoinbaseWallet,
        isTrust: p.isTrust || p.isTrustWallet
      })));
    }
  };

  // Effect to handle hydration
  useEffect(() => {
    try {
      // Debug Wagmi config
      console.log('Initializing WagmiWrapper with config:', {
        chains: config.chains.map(c => c.name),
        connectors: config.connectors.map(c => c.name),
      });
      
      // Detect wallet conflicts
      detectWalletConflicts();
      
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