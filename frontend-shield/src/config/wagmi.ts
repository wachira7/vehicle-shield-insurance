import { createConfig, http, fallback } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { InjectedConnector, MetaMaskConnector, WalletConnectConnector , CoinbaseWalletConnector, SafeConnector } from '@wagmi/core/connectors'

// You'll need a WalletConnect project ID
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: fallback([
      http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
      http()
    ])
  },
  connectors: [
    new MetaMaskConnector(),
    new WalletConnectConnector({
      projectId,
      metadata: {
        name: 'VehicleShield',
        description: 'Blockchain-based Vehicle Insurance',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        icons: [typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '']
      }
    }),
    new CoinbaseWalletConnector({ 
      appName: 'VehicleShield',
      chainId: sepolia.id 
    }),
    new InjectedConnector({
      options: {
        shimDisconnect: true,
      }
    }),
    new SafeConnector()
  ]
})

