'use client'

/**
 * Helper functions for working with Ethereum providers when multiple wallets are installed
 */

// Define the provider interface
interface EthereumProvider {
  isMetaMask?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isPhantom?: boolean;
  isSolana?: boolean;
  providers?: EthereumProvider[];
  request?: (args: {method: string; params?: unknown[]}) => Promise<unknown>;
}

// Define window properties safely without conflicting with existing declarations
declare global {
  // Only add the 'phantom' property - 'ethereum' is already declared elsewhere
  interface Window {
    phantom?: unknown;
  }
}

// Helper function to access the ethereum provider while handling type issues
const getEthereumProvider = (): EthereumProvider | null => {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  return window.ethereum as unknown as EthereumProvider;
};

/**
 * Detect if MetaMask is available
 */
export const isMetaMaskAvailable = (): boolean => {
  const ethereum = getEthereumProvider();
  if (!ethereum) return false;
  
  // If providers array exists, check if any provider is MetaMask
  if (ethereum.providers?.length) {
    return ethereum.providers.some(p => p.isMetaMask === true);
  }
  
  // Otherwise check the main provider
  return !!ethereum.isMetaMask;
};

/**
 * Detect if Trust Wallet is available
 */
export const isTrustWalletAvailable = (): boolean => {
  const ethereum = getEthereumProvider();
  if (!ethereum) return false;
  
  // If providers array exists, check if any provider is Trust Wallet
  if (ethereum.providers?.length) {
    return ethereum.providers.some(p => p.isTrust === true || p.isTrustWallet === true);
  }
  
  // Otherwise check the main provider
  return !!(ethereum.isTrust || ethereum.isTrustWallet);
};

/**
 * Detect if Phantom is available
 */
export const isPhantomAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check if Phantom is available in window object
  if (window.phantom) return true;
  
  // Sometimes Phantom can also inject itself into window.ethereum
  const ethereum = getEthereumProvider();
  if (!ethereum) return false;
  
  // Look for "phantom" or "Phantom" in the provider name or id
  // This is a fallback detection mechanism
  if (ethereum.isPhantom) return true;
  
  if (ethereum.providers?.length) {
    return ethereum.providers.some(p => 
      p.isPhantom || 
      (p as EthereumProvider)?.isSolana || 
      (p as EthereumProvider)?.isPhantom
    );
  }
  
  return false;
};

/**
 * Get the MetaMask provider if available
 */
export const getMetaMaskProvider = (): EthereumProvider | null => {
  const ethereum = getEthereumProvider();
  if (!ethereum) return null;
  
  // If providers array exists, find MetaMask provider
  if (ethereum.providers?.length) {
    const provider = ethereum.providers.find(p => p.isMetaMask === true);
    return provider || null;
  }
  
  // Otherwise check if main provider is MetaMask
  return ethereum.isMetaMask ? ethereum : null;
};

/**
 * Get the Trust Wallet provider if available
 */
export const getTrustWalletProvider = (): EthereumProvider | null => {
  const ethereum = getEthereumProvider();
  if (!ethereum) return null;
  
  // If providers array exists, find Trust Wallet provider
  if (ethereum.providers?.length) {
    const provider = ethereum.providers.find(p => p.isTrust === true || p.isTrustWallet === true);
    return provider || null;
  }
  
  // Otherwise check if main provider is Trust Wallet
  return (ethereum.isTrust || ethereum.isTrustWallet) ? ethereum : null;
};

/**
 * Makes MetaMask the preferred provider by setting it as window.ethereum
 * This is helpful before connecting to ensure MetaMask is selected
 */
export const preferMetaMask = (): void => {
  const ethereum = getEthereumProvider();
  if (!ethereum || !ethereum.providers?.length) return;
  
  const metaMaskProvider = ethereum.providers.find(p => p.isMetaMask === true);
  if (metaMaskProvider && metaMaskProvider !== ethereum) {
    // Force MetaMask to be the primary provider
    console.log('Setting MetaMask as the preferred provider');
    // this is a hack to force MetaMask to be the primary provider
    window.ethereum = metaMaskProvider;
  }
};