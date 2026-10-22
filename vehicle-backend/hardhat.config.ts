import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const { SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY, REPORT_GAS } = process.env;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    // OpenZeppelin 5.4+ uses mcopy, which needs Cancun (live on mainnet and Sepolia).
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    ...(SEPOLIA_RPC_URL && {
      sepolia: {
        url: SEPOLIA_RPC_URL,
        accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      },
    }),
  },
  // Sourcify verification goes through scripts/lib/sourcify.ts: hardhat-verify 2.x
  // still calls Sourcify's removed v1 API. Etherscan verification runs only with a key.
  sourcify: {
    enabled: false,
  },
  etherscan: {
    enabled: Boolean(ETHERSCAN_API_KEY),
    apiKey: ETHERSCAN_API_KEY || "",
  },
  gasReporter: {
    enabled: Boolean(REPORT_GAS),
  },
};

export default config;
