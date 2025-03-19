//src/app/utils/ethereum-helpers.ts
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

// Safely access properties with error handling
const safelyAccessProperty = <T, K extends keyof T>(obj: T | null | undefined, property: K): T[K] | undefined => {
  try {
    if (obj == null) return undefined;
    return obj[property];
  } catch (error) {
    console.warn(`Error accessing property ${String(property)}:`, error);
    return undefined;
  }
};

// Helper function to access the ethereum provider while handling type issues
const getEthereumProvider = (): EthereumProvider | null => {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  return window.ethereum as unknown as EthereumProvider;
};

/**
 * Detect if MetaMask is available
 */
export const isMetaMaskAvailable = (): boolean => {
  try {
    const ethereum = getEthereumProvider();
    if (!ethereum) return false;
    
    // If providers array exists, check if any provider is MetaMask
    if (safelyAccessProperty(ethereum, 'providers')?.length) {
      try {
        return !!ethereum.providers?.some(p => safelyAccessProperty(p, 'isMetaMask') === true);
      } catch (error) {
        console.warn("Error checking providers for MetaMask:", error);
      }
    }
    
    // Otherwise check the main provider
    return !!safelyAccessProperty(ethereum, 'isMetaMask');
  } catch (error) {
    console.warn("Error in isMetaMaskAvailable:", error);
    return false;
  }
};

/**
 * Detect if Trust Wallet is available
 */
export const isTrustWalletAvailable = (): boolean => {
  try {
    const ethereum = getEthereumProvider();
    if (!ethereum) return false;
    
    // If providers array exists, check if any provider is Trust Wallet
    if (safelyAccessProperty(ethereum, 'providers')?.length) {
      try {
        const result = ethereum.providers?.some(p => 
          safelyAccessProperty(p, 'isTrust') === true || 
          safelyAccessProperty(p, 'isTrustWallet') === true
        );
        return result === true; // Ensure boolean return
      } catch (error) {
        console.warn("Error checking providers for Trust Wallet:", error);
        return false;
      }
    }
    
    // First try the newer property
    if (safelyAccessProperty(ethereum, 'isTrustWallet') === true) return true;
    
    // Then try the older one
    if (safelyAccessProperty(ethereum, 'isTrust') === true) return true;
    
    return false;
  } catch (error) {
    console.warn("Error in isTrustWalletAvailable:", error);
    return false;
  }
};

/**
 * Detect if Phantom is available
 */
export const isPhantomAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    
    // Check if Phantom is available in window object
    if (safelyAccessProperty(window, 'phantom')) return true;
    
    // Sometimes Phantom can also inject itself into window.ethereum
    const ethereum = getEthereumProvider();
    if (!ethereum) return false;
    
    // Look for "phantom" or "Phantom" in the provider name or id
    if (safelyAccessProperty(ethereum, 'isPhantom') === true) return true;
    
    if (safelyAccessProperty(ethereum, 'providers')?.length) {
      try {
        const result = ethereum.providers?.some(p => 
          safelyAccessProperty(p, 'isPhantom') === true || 
          safelyAccessProperty(p, 'isSolana') === true
        );
        return result === true; // Ensure boolean return
      } catch (error) {
        console.warn("Error checking providers for Phantom:", error);
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.warn("Error in isPhantomAvailable:", error);
    return false;
  }
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
 * Detect if Coinbase Wallet is available
 */
export const isCoinbaseWalletAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for Coinbase Wallet browser extension
  if (window.coinbaseWalletExtension) return true;
  
  // Check in ethereum provider
  const ethereum = getEthereumProvider();
  if (!ethereum) return false;
  
  // Check main provider
  if (ethereum.isCoinbaseWallet) return true;
  
  // Check in providers array
  if (ethereum.providers?.length) {
    return ethereum.providers.some(p => 
      p.isCoinbaseWallet || 
      'isWalletLink' in p || 
      'isCoinbase' in p
    );
  }
  
  // Additional fallback checks
  // Check for CoinbaseWalletSDK in window
  if ('CoinbaseWalletSDK' in window) return true;
  
  // Check for coinbaseWalletSDK connector in the connectors list
  const hasConnector = document.querySelector('[data-testid="coinbase-wallet-connector"]') !== null;
  if (hasConnector) return true;
  
  return false;
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