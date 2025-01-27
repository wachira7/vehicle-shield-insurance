import { configureChains, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { alchemyProvider } from '@wagmi/core/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'

// Configure Wagmi to use the Sepolia network and connect to the MetaMask plugin.
const { chains, publicClient } = configureChains(
  [sepolia],
  [
    alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY! }),
    publicProvider()
  ]
)

export const config = createConfig({
  autoConnect: true,
  connectors: [new MetaMaskConnector({ chains })],
  publicClient
})