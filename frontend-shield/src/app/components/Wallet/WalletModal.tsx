'use client'
import { useConnect } from 'wagmi'
import { LucideIcon, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { isMetaMaskAvailable, isTrustWalletAvailable, isPhantomAvailable, isCoinbaseWalletAvailable, getMetaMaskProvider, getTrustWalletProvider } from '@/app/utils/ethereum-helpers';

// Define types for Ethereum providers
interface EthereumProvider {
  isMetaMask?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isPhantom?: boolean;
  isBraveWallet?: boolean; // Added for Brave wallet detection
  providers?: EthereumProvider[];
  request?: (args: {method: string; params?: unknown[]}) => Promise<unknown>;
}

// Define type for Phantom provider
interface PhantomProvider {
  solana?: unknown;
  ethereum?: unknown;
  isPhantom?: boolean;
}

// Extended window interface for type safety
interface ExtendedWindow extends Window {
  ethereum?: EthereumProvider;
  phantom?: PhantomProvider;
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
        const extWindow = window as ExtendedWindow;
        const ethereum = extWindow.ethereum;
        if (ethereum?.providers) {
          console.log('window.ethereum.providers:', ethereum.providers);
        }
      }
    }
  }, [isOpen, connectors]);

  // This function handles special preparation before connecting to specific wallets
  const prepareWalletConnection = async (walletId: string): Promise<boolean> => {
    try {
      console.log(`Preparing connection for ${walletId}`);
      
      // For any injected wallet, try to isolate the correct provider
      if ((walletId === 'metamask' || walletId === 'trust' || walletId === 'phantom') && 
          typeof window !== 'undefined' && window.ethereum) {
        
        // Store the original provider to restore it if needed
        // Use the extended window interface
        const extWindow = window as ExtendedWindow;
        const ethereum = extWindow.ethereum as EthereumProvider;
        const originalProvider = ethereum;
        console.log(`Original provider:`, originalProvider);
        
        try {
          // Use ExtendedWindow for type safety
          const extWindow = window as ExtendedWindow;
          const ethereum = extWindow.ethereum as EthereumProvider;
          
          // Find the specific provider based on wallet ID
          if (walletId === 'metamask' && ethereum.providers?.length) {
            const provider = ethereum.providers.find((p: EthereumProvider) => p.isMetaMask && !p.isBraveWallet);
            if (provider) {
              console.log('Found MetaMask provider, setting as primary');
      
              // Set ethereum provider
              (window as ExtendedWindow).ethereum = provider;
              
              // Try to wake up the wallet
              try {
                // Don't await this as it might hang
                provider.request?.({ method: 'eth_chainId' });
              } catch (e) {
                console.warn('Non-blocking chain request error:', e);
              }
              return true;
            }
          }
          else if (walletId === 'trust' && ethereum.providers?.length) {
            const provider = ethereum.providers.find((p: EthereumProvider) => p.isTrust || p.isTrustWallet);
            if (provider) {
              console.log('Found Trust Wallet provider, setting as primary');
            
              (window as ExtendedWindow).ethereum = provider;
              return true;
            }
          }
          else if (walletId === 'phantom') {
            // For Phantom, we need to check if Solana is available
            const extWindow = window as ExtendedWindow;
            const phantom = extWindow.phantom;
            if (phantom?.solana) {
              console.log('Found Phantom provider for Solana');
              // No need to override ethereum for Solana wallets
              return true;
            }
            
            // Some Phantom versions also inject into ethereum
            if (ethereum.providers?.length) {
              const provider = ethereum.providers.find((p: EthereumProvider) => p.isPhantom);
              if (provider) {
                console.log('Found Phantom provider for Ethereum, setting as primary');
                (window as ExtendedWindow).ethereum = provider;
                return true;
              }
            }
          }
          
          // If we couldn't find a specific provider but the wallet ID matches a property
          // on the main ethereum object, use that
          if (walletId === 'metamask' && ethereum.isMetaMask) {
            console.log('Using main provider which has isMetaMask=true');
            return true;
          }
          else if (walletId === 'trust' && (ethereum.isTrust || ethereum.isTrustWallet)) {
            console.log('Using main provider which has isTrust=true');
            return true;
          }
          else if (walletId === 'phantom' && ethereum.isPhantom) {
            console.log('Using main provider which has isPhantom=true');
            return true;
          }
          
          // If we get here, we couldn't identify the specific provider
          console.warn(`Could not identify specific provider for ${walletId}`);
          // Restore original provider if we couldn't find the right one
          (window as ExtendedWindow).ethereum = originalProvider;
          return false; // Return false to indicate we couldn't find the specific provider
          
        } catch (err) {
          console.error(`Error preparing ${walletId} connection:`, err);
          // Restore original provider
          (window as ExtendedWindow).ethereum = originalProvider;
          return false; // Return false to indicate failure
        }
      }
      
      return true; // Return true for non-injected wallets or if no ethereum is available
    } catch (error) {
      console.error("Error in prepareWalletConnection:", error);
      return false; // Return false to indicate failure
    }
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
        setIsConnecting(null);
        return;
      }
      else if (wallet.id === 'trust' && !isTrustWalletAvailable()) {
        setConnectError('Trust Wallet is not installed');
        setIsConnecting(null);
        return;
      }
      else if (wallet.id === 'phantom' && !isPhantomAvailable()) {
        setConnectError('Phantom is not installed');
        setIsConnecting(null);
        return;
      }
      
      // Prepare wallet connection (special case handling)
      const prepared = await prepareWalletConnection(wallet.id);
      if (!prepared) {
        setConnectError(`Failed to prepare ${wallet.name} connection`);
        setIsConnecting(null);
        return;
      }
      
      try {
        // Connect with the connector
        await connect({ connector });
        
        console.log(`Successfully connected with ${connector.id}`);
        setDebugInfo(`Connected using ${connector.name}`);
        onClose();
      } catch (connectError) {
        console.error('Connection error, trying alternative approach:', connectError);
        
        // If there was an error and this is an injected wallet, try a more direct approach
        if (wallet.id === 'metamask' || wallet.id === 'trust' || wallet.id === 'phantom') {
          try {
            // Try to directly request accounts from the provider
            if (typeof window !== 'undefined' && window.ethereum) {
              console.log('Trying direct eth_requestAccounts request');
              const extWindow = window as ExtendedWindow;
              const ethereum = extWindow.ethereum;
              await ethereum?.request?.({ method: 'eth_requestAccounts' });
              console.log('Direct request successful');
              setDebugInfo(`Connected to ${wallet.name} using direct request`);
              onClose();
              return;
            }
          } catch (directError) {
            console.error('Direct connection also failed:', directError);
            throw connectError; // Throw the original error
          }
        }
        
        throw connectError;
      }
    } catch (error) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setConnectError(errorMessage);
      setDebugInfo(`Error: ${errorMessage}`);
    } finally {
      setIsConnecting(null);
    }
  };

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
      connectorId: 'coinbaseWallet',
      checkAvailability: isCoinbaseWalletAvailable
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
            {error?.message}
          </div>
        )}
        
        <div className="mt-4 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 overflow-x-auto">
          {debugInfo || "No debug information available"}
          {connectors.length === 0 && <p className="text-orange-500">No connectors available</p>}
          <div className="mt-2">
            <div className="font-semibold">Wallet Detection:</div>
            <ul className="list-disc pl-4">
              <li>MetaMask: {isMetaMaskAvailable() ? "Available" : "Not Available"}</li>
              <li>Trust Wallet: {isTrustWalletAvailable() ? "Available" : "Not Available"}</li>
              <li>Phantom: {isPhantomAvailable() ? "Available" : "Not Available"}</li>
              <li>Coinbase Wallet: {isCoinbaseWalletAvailable() ? "Available" : "Not Available"}</li>
              <li>window.ethereum: {typeof window !== 'undefined' && window.ethereum ? "Present" : "Not Present"}</li>
            </ul>
          </div>

          <div className="mt-2">
            <div className="font-semibold">Extension Conflicts:</div>
            <div className="text-xs text-gray-600 mt-1">
              Multiple wallet extensions can conflict with each other. Try:
              <ol className="list-decimal pl-5 mt-1">
                <li>Disabling all wallet extensions except the one you want to use</li>
                <li>Using an incognito/private window with only one extension enabled</li>
                <li>Using a different browser for different wallets</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}