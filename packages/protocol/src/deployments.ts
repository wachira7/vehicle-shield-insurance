// Addresses of deployed contracts. vehicle-backend/scripts/deploy.ts writes these files;
// only public networks are committed.
import sepolia from "../deployments/sepolia.json";

export interface Deployment {
  network: string;
  chainId: number;
  deployedAt: string;
  startBlock: number; // first block to index
  contracts: { InsuranceCore: string; PolicyNFT: string; USDC: string };
  usdcIsMock: boolean;
  roles: Record<string, string>;
}

export const deployments: Record<string, Deployment> = {
  sepolia,
};
