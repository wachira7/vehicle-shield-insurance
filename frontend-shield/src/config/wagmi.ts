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

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    )
  },
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "",
      metadata: {
        name: 'VehicleShield',
        description: 'Blockchain-based Vehicle Insurance',
        url: getOrigin(),
        icons: [`${getOrigin()}/logo.png`]
      }
    }),
    coinbaseWallet({ 
      appName: 'VehicleShield',
    })
  ],
  storage: getStorage()
})