"use client"
import { createConfig, http } from 'wagmi'
import { sepolia } from 'viem/chains'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'

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
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
      metadata: {
        name: 'VehicleShield',
        description: 'Blockchain-based Vehicle Insurance',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '']
      }
    }),
    coinbaseWallet({ 
      appName: 'VehicleShield',
    })
  ]
})