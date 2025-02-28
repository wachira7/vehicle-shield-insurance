"use client";
import { createConfig, http, createStorage } from "wagmi";
import { sepolia } from "viem/chains";
import { walletConnect, injected, coinbaseWallet } from "wagmi/connectors";

// Function to safely get window origin for metadata
const getOrigin = () => (typeof window !== "undefined" ? window.location.origin : "");

// Initialize Wagmi config
export const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(
      `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    ),
  },
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
      metadata: {
        name: "VehicleShield",
        description: "Blockchain-based Vehicle Insurance",
        url: getOrigin(),
        icons: [`${getOrigin()}/logo.png`],
      },
    }),
    coinbaseWallet({
      appName: "VehicleShield",
    }),
  ],
  storage: createStorage({ storage: typeof window !== "undefined" ? window.localStorage : undefined }), 
});
