// src/config/wagmi.ts
"use client"
import { createConfig, http, createStorage } from 'wagmi'
import { sepolia } from 'viem/chains'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'

// Safely get window origin for metadata
const getOrigin = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

// Safe storage initialization
const getStorage = () => {
  if (typeof window === 'undefined') return undefined;
  return createStorage({ storage: window.localStorage });
}

// Load environment variables with fallbacks
const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

// Debug logs for troubleshooting
if (typeof window !== 'undefined') {
  console.log("WalletConnect Project ID length:", WALLET_CONNECT_PROJECT_ID.length);
  console.log("Alchemy API Key length:", ALCHEMY_API_KEY.length);
}

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    )
  },
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId: WALLET_CONNECT_PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: 'VehicleShield',
        description: 'Blockchain-based Vehicle Insurance',
        url: getOrigin(),
        icons: [`${getOrigin()}/images/reshot-icon-insurance-car-XSU4P3RWKN.svg`]
      }
    }),
    coinbaseWallet({ 
      appName: 'VehicleShield',
      appLogoUrl: `${getOrigin()}/images/reshot-icon-insurance-car-XSU4P3RWKN.svg`,
    })
  ],
  storage: getStorage()
})