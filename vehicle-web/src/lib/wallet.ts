// Wallet connection: Reown AppKit on top of wagmi. One identity per person (a wallet), with
// several ways in: Google and other social logins or email (AppKit creates a wallet for the
// user) or an existing wallet such as MetaMask or a mobile wallet.
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { sepolia } from "@reown/appkit/networks";

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";
export const networks: [typeof sepolia] = [sepolia];

export const wagmiAdapter = new WagmiAdapter({ networks, projectId, ssr: true });

export const appKitOptions = {
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "VehicleShield",
    description: "Car insurance you can check, with claims you can track",
    url: typeof window !== "undefined" ? window.location.origin : "https://vsi-app.vercel.app",
    icons: ["https://vsi-app.vercel.app/icon.svg"],
  },
  features: {
    email: true,
    socials: ["google", "apple", "x", "discord", "github"] as ("google" | "apple" | "x" | "discord" | "github")[],
    emailShowWallets: true,
    analytics: false,
  },
  // Plain accounts by default; the API also accepts smart-account signatures.
  defaultAccountTypes: { eip155: "eoa" as const },
  themeMode: "dark" as const,
  themeVariables: {
    "--w3m-accent": "#2dd4a7",
    "--w3m-color-mix": "#0a1020",
    "--w3m-color-mix-strength": 25,
    "--w3m-border-radius-master": "3px",
    "--w3m-font-family": "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    "--w3m-z-index": 60,
  },
};
