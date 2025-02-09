"use client"
import { configureChains, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'
import { InjectedConnector } from 'wagmi/connectors/injected'

// Configure chains & providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sepolia],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY! }),
    publicProvider()
  ]
)

// Set up wagmi config
export const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
        metadata: {
          name: 'VehicleShield',
          description: 'Blockchain-based Vehicle Insurance',
          url: typeof window !== 'undefined' ? window.location.origin : '',
          icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '']
        }
      }
    }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'VehicleShield',
      }
    }),
    new InjectedConnector({
      chains,
      options: {
        name: 'Injected',
        shimDisconnect: true,
      }
    })
  ],
  publicClient,
  webSocketPublicClient
})