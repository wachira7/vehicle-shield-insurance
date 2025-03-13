//src/app/components/Wallet/WalletModal.tsx
'use client'
import { useConnect } from 'wagmi'
import { Wallet, CreditCard, Shield, Ghost, LucideIcon, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

// Define types for Ethereum providers
interface EthereumProvider {
  isMetaMask?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  providers?: EthereumProvider[];
  request?: (args: {method: string; params?: unknown[]}) => Promise<unknown>;
}

// Only declare phantom since ethereum is already declared elsewhere
declare global {
  interface Window {
    phantom?: unknown;
  }
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WalletOption = {
  name: string;
  Icon: LucideIcon;
  id: string;
  connectorId: string; // Exact ID of the connector to use
  checkAvailability?: () => boolean; // Function to check if wallet is available
}

export const WalletModal = ({ isOpen, onClose }: WalletModalProps) => {
  const { connect, connectors, error } = useConnect()
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [connectError, setConnectError] = useState<string | null>(null)
  
  // Reset states when modal closes or opens
  useEffect(() => {
    setIsConnecting(null)
    setConnectError(null)
    
    if (isOpen) {
      const connectorsInfo = connectors.map(c => ({ 
        id: c.id, 
        name: c.name,
        ready: c.ready
      }));
      console.log('Available connectors:', connectorsInfo);
      setDebugInfo(`Found ${connectors.length} connectors: ${connectors.map(c => c.id).join(', ')}`);
    }
  }, [isOpen, connectors]);

  // Helper function to get the ethereum provider with proper typing
  const getEthereumProvider = (): EthereumProvider | null => {
    if (typeof window === 'undefined' || !window.ethereum) return null;
    return window.ethereum as unknown as EthereumProvider;
  };

  // Helper function to detect MetaMask
  const isMetaMaskAvailable = () => {
    const provider = getEthereumProvider();
    return Boolean(provider?.isMetaMask);
  };

  // Helper function to detect Trust Wallet
  const isTrustWalletAvailable = () => {
    const provider = getEthereumProvider();
    return Boolean(provider?.isTrust || provider?.isTrustWallet);
  };

  // Helper function to detect Phantom
  const isPhantomAvailable = () => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.phantom);
  };
  
  // Map of wallet connectors with availability checks
  const wallets: WalletOption[] = [
    {
      name: 'MetaMask',
      Icon: Wallet,
      id: 'metamask',
      connectorId: 'injected',
      checkAvailability: isMetaMaskAvailable
    },
    {
      name: 'Trust Wallet',
      Icon: Shield, 
      id: 'trust',
      connectorId: 'injected',
      checkAvailability: isTrustWalletAvailable
    },
    {
      name: 'Phantom',
      Icon: Ghost, 
      id: 'phantom',
      connectorId: 'injected',
      checkAvailability: isPhantomAvailable
    },
    {
      name: 'WalletConnect',
      Icon: CreditCard,
      id: 'walletconnect',
      connectorId: 'walletConnect'
    }
  ]

  if (!isOpen) return null

  const handleConnect = async (wallet: WalletOption) => {
    try {
      setConnectError(null);
      
      // Find the specified connector
      const connector = connectors.find(c => c.id === wallet.connectorId);
      
      if (!connector) {
        setConnectError(`No connector found for ${wallet.name}`);
        return;
      }
      
      console.log(`Attempting to connect with ${connector.id} (${connector.name}) for ${wallet.name}`);
      setDebugInfo(`Connecting to ${wallet.name} using ${connector.name}...`);
      setIsConnecting(wallet.name);
      
      // Add custom parameters based on wallet type
      if (wallet.id === 'metamask' && !isMetaMaskAvailable()) {
        setConnectError('MetaMask is not installed');
        return;
      }
      else if (wallet.id === 'trust' && !isTrustWalletAvailable()) {
        setConnectError('Trust Wallet is not installed');
        return;
      }
      else if (wallet.id === 'phantom' && !isPhantomAvailable()) {
        setConnectError('Phantom is not installed');
        return;
      }
      
      // Connect with the connector
      await connect({ connector });
      
      console.log(`Successfully connected with ${connector.id}`);
      setDebugInfo(`Connected using ${connector.name}`);
      onClose();
    } catch (error) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConnectError(errorMessage);
      setDebugInfo(`Error: ${errorMessage}`);
    } finally {
      setIsConnecting(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Connect Wallet</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {wallets.map((wallet) => {
            // Check if wallet is available
            const isWalletAvailable = wallet.checkAvailability 
              ? wallet.checkAvailability() 
              : connectors.some(c => c.id === wallet.connectorId);
            
            const { Icon, name } = wallet;
            const isWalletConnecting = isConnecting === name;
            const isDisabled = isConnecting !== null || !isWalletAvailable;
            
            return (
              <button
                key={name}
                onClick={() => handleConnect(wallet)}
                disabled={isDisabled}
                className={`flex flex-col items-center p-4 border rounded-lg transition-colors duration-200
                          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}`}
              >
                {isWalletConnecting ? (
                  <Loader2 className="w-10 h-10 mb-2 text-blue-600 animate-spin" />
                ) : (
                  <Icon className="w-10 h-10 mb-2 text-blue-600" />
                )}
                <span className="text-sm font-medium">{name}</span>
                {isWalletConnecting && 
                  <span className="text-xs text-blue-600 mt-1">Connecting...</span>
                }
                {!isWalletAvailable && 
                  <span className="text-xs text-red-500 mt-1">Not Available</span>
                }
              </button>
            );
          })}
        </div>
        
        {connectError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {connectError}
          </div>
        )}
        
        {error && !connectError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error.message}
          </div>
        )}
        
        <div className="mt-4 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 overflow-x-auto">
          {debugInfo || "No debug information available"}
          {connectors.length === 0 && <p className="text-orange-500">No connectors available</p>}
        </div>
      </div>
    </div>
  );
}