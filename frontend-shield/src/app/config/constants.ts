//src/app/config/constants.ts
// Update these when deploying to Sepolia or other networks
export const CONTRACT_ADDRESSES = {
    InsuranceCore: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    PolicyNFT: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    RiskAssessment: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
} as const;

// Network configurations
export const SUPPORTED_NETWORKS = {
    sepolia: {
        chainId: 11155111,
        name: 'Sepolia',
        currency: 'ETH',
        explorerUrl: 'https://sepolia.etherscan.io',
        rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/your-api-key'
    },
    localhost: {
        chainId: 31337,
        name: 'Localhost',
        currency: 'ETH',
        explorerUrl: 'http://localhost:8545',
        rpcUrl: 'http://localhost:8545'
    }
} as const;

// Insurance-related constants
export const INSURANCE_CONSTANTS = {
    MIN_COVERAGE: '0.1', // in ETH
    MAX_COVERAGE: '10', // in ETH
    MIN_DURATION: 30, // in days
    MAX_DURATION: 365, // in days
    CONDITION_SCALE: 10, // 1-10 scale for vehicle condition
    MAX_MILEAGE: 1000000 // maximum mileage allowed
} as const;

// Vehicle photo requirements
export const PHOTO_REQUIREMENTS = {
    maxSize: 5 * 1024 * 1024, // 5MB
    acceptedTypes: ['image/jpeg', 'image/png'],
    requiredViews: [
        'front',
        'back',
        'left',
        'right',
        'mirrorLeft',
        'mirrorRight'
    ]
} as const;

// Status messages
export const STATUS_MESSAGES = {
    PENDING: 'Pending',
    VERIFIED: 'Verified',
    REJECTED: 'Rejected',
    PROCESSING: 'Processing',
    COMPLETED: 'Completed'
} as const;