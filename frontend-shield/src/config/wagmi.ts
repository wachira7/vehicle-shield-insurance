import { createConfig, http, fallback } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { InjectedConnector } from 'wagmi/connectors/injected';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet';
import { SafeConnector } from 'wagmi/connectors/safe';

// Validate environment variables
if (!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID) {
  throw new Error("NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is required.");
}
if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
  throw new Error("NEXT_PUBLIC_ALCHEMY_API_KEY is required.");
}

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
const origin = typeof window !== 'undefined' ? window.location.origin : '';
const iconUrl = origin ? `${origin}/logo.png` : 'https://default-logo-url.com/logo.png';

export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: fallback([
      http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
      http(`https://rpc.ankr.com/eth_sepolia`)
    ])
  },
  connectors: [
    new MetaMaskConnector(),
    new WalletConnectConnector({
      projectId,
      metadata: {
        name: 'VehicleShield',
        description: 'Blockchain-based Vehicle Insurance',
        url: origin,
        icons: [iconUrl]
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
});
