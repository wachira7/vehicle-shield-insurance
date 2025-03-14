'use client'
import { useConnect } from 'wagmi'
import { LucideIcon, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { isMetaMaskAvailable, isTrustWalletAvailable, isPhantomAvailable, getMetaMaskProvider, getTrustWalletProvider } from '@/app/utils/ethereum-helpers'

// Define types for Ethereum providers
interface EthereumProvider {
  isMetaMask?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isPhantom?: boolean;
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
  Icon: LucideIcon | (() => JSX.Element);
  id: string;
  connectorId: string; // Exact ID of the connector to use
  checkAvailability?: () => boolean; // Function to check if wallet is available
  getProvider?: () => EthereumProvider | null; // Function to get the specific provider
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
      
      // Debug ethereum providers
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log('window.ethereum:', window.ethereum);
        if (window.ethereum.providers) {
          console.log('window.ethereum.providers:', window.ethereum.providers);
        }
      }
    }
  }, [isOpen, connectors]);

  // We're using the imported helper functions from ethereum-helpers.ts

  // This function handles special preparation before connecting to specific wallets
  const prepareWalletConnection = async (walletId: string): Promise<boolean> => {
    // Special case for MetaMask when multiple wallets are installed
    if (walletId === 'metamask' && typeof window !== 'undefined' && window.ethereum) {
      const ethereum = window.ethereum as unknown as EthereumProvider;
      
      // Check if we have multiple providers
      if (ethereum.providers?.length) {
        // Find MetaMask provider
        const metaMaskProvider = ethereum.providers.find(p => p.isMetaMask);
        
        if (metaMaskProvider) {
          try {
            console.log('Attempting direct interaction with MetaMask provider before connection');
            
            // Force the browser to use the MetaMask provider
            // This is a way to override Coinbase or other wallets taking precedence
            // This is an intentional override
            window.ethereum = metaMaskProvider;
            
            // We'll no longer try to request accounts directly, just return true
            // to let the connector handle it
            return true;
          } catch (err) {
            console.error('Error preparing MetaMask connection:', err);
            // Even if there's an error here, we'll continue with the connection
            // as the error might be with the preparation, not the connection itself
            return true;
          }
        }
      }
    }
    return true;
  };

  const handleConnect = async (wallet: WalletOption) => {
    try {
      setConnectError(null);
      
      // Find the specified connector
      let connector = connectors.find(c => c.id === wallet.connectorId);
      
      // If not found directly, try some fallbacks
      if (!connector) {
        // For injected wallets, try to find any injected connector
        if (wallet.id === 'metamask' || wallet.id === 'trust' || wallet.id === 'phantom') {
          connector = connectors.find(c => c.id === 'injected');
        } 
        // For WalletConnect, try variations on the name
        else if (wallet.id === 'walletconnect') {
          connector = connectors.find(c => 
            c.id.toLowerCase().includes('walletconnect') ||
            c.name.toLowerCase().includes('walletconnect')
          );
        }
        // For Coinbase, try variations on the name
        else if (wallet.id === 'coinbaseWallet') {
          connector = connectors.find(c => 
            c.id.toLowerCase().includes('coinbase') ||
            c.name.toLowerCase().includes('coinbase')
          );
        }
      }
      
      // If still not found, error out
      if (!connector) {
        console.error('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));
        setConnectError(`No connector found for ${wallet.name}`);
        return;
      }
      
      // Log the connector we're using
      console.log(`Using connector: ${connector.id} (${connector.name}) for ${wallet.name}`);
      
      console.log(`Attempting to connect with ${connector.id} (${connector.name}) for ${wallet.name}`);
      setDebugInfo(`Connecting to ${wallet.name} using ${connector.name}...`);
      setIsConnecting(wallet.name);
      
      // Check wallet availability
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
      
      // Prepare wallet connection (special case for MetaMask)
      const prepared = await prepareWalletConnection(wallet.id);
      if (!prepared) {
        setConnectError(`Failed to prepare ${wallet.name} connection`);
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

  // Map of wallet connectors with availability checks
  const wallets: WalletOption[] = [
    {
      name: 'MetaMask',
      Icon: () => (
        <div className="w-10 h-10 mb-2 relative">
          <Image 
            src="/images/wallet-icons/metamask.png" 
            alt="MetaMask" 
            fill
            sizes="40px"
            priority
          />
        </div>
      ),
      id: 'metamask',
      connectorId: 'injected',
      checkAvailability: isMetaMaskAvailable,
      getProvider: getMetaMaskProvider
    },
    {
      name: 'Trust Wallet',
      Icon: () => (
        <div className="w-10 h-10 mb-2 relative">
          <Image 
            src="/images/wallet-icons/trustwallet.png" 
            alt="Trust Wallet" 
            fill
            sizes="40px"
          />
        </div>
      ),
      id: 'trust',
      connectorId: 'injected',
      checkAvailability: isTrustWalletAvailable,
      getProvider: getTrustWalletProvider
    },
    {
      name: 'Phantom',
      Icon: () => (
        <div className="w-10 h-10 mb-2 relative">
          <Image 
            src="/images/wallet-icons/phantom.png" 
            alt="Phantom" 
            fill
            sizes="40px"
          />
        </div>
      ),
      id: 'phantom',
      connectorId: 'injected',
      checkAvailability: isPhantomAvailable
    },
    {
      name: 'WalletConnect',
      Icon: () => (
        <div className="w-10 h-10 mb-2 relative">
          <Image 
            src="/images/wallet-icons/walletconnect.jpeg" 
            alt="WalletConnect" 
            fill
            sizes="40px"
            className="rounded-full"
          />
        </div>
      ),
      id: 'walletconnect',
      connectorId: 'walletConnect'
    },
    {
      name: 'Coinbase Wallet',
      Icon: () => (
        <div className="w-10 h-10 mb-2 relative">
          <Image 
            src="/images/wallet-icons/coinbase.jpeg" 
            alt="Coinbase Wallet" 
            fill
            sizes="40px"
          />
        </div>
      ),
      id: 'coinbaseWallet',
      connectorId: 'coinbaseWallet'
    }
  ]

  if (!isOpen) return null

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
                  typeof Icon === 'function' ? <Icon /> : <div className="w-10 h-10 mb-2">{Icon}</div>
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
          <div className="mt-2">
            <div className="font-semibold">Available Connectors:</div>
            <ul className="list-disc pl-4">
              {connectors.map((c, i) => (
                <li key={i}>{c.name} (ID: {c.id}) - {c.ready ? "Ready" : "Not Ready"}</li>
              ))}
            </ul>
          </div>
          <div className="mt-2">
            <div className="font-semibold">Wallet Detection:</div>
            <ul className="list-disc pl-4">
              <li>MetaMask: {isMetaMaskAvailable() ? "Available" : "Not Available"}</li>
              <li>Trust Wallet: {isTrustWalletAvailable() ? "Available" : "Not Available"}</li>
              <li>Phantom: {isPhantomAvailable() ? "Available" : "Not Available"}</li>
              <li>window.ethereum: {typeof window !== 'undefined' && window.ethereum ? "Present" : "Not Present"}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}