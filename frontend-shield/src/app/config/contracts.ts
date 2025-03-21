//src/app/config/contracts.ts
import InsuranceCoreABI from './abis/InsuranceCore.json';
import PolicyNFTABI from './abis/PolicyNFT.json';
import RiskAssessmentABI from './abis/RiskAssessment.json';
import IVehicleShieldABI from './abis/IVehicleShield.json';

// Contract addresses from your deployment
export const CONTRACT_ADDRESSES = {
    InsuranceCore: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    PolicyNFT: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    RiskAssessment: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
} as const;

export {
    InsuranceCoreABI,
    PolicyNFTABI,
    RiskAssessmentABI,
    IVehicleShieldABI
};


export enum VerificationTier {
    Basic,
    Medium,
    Premium
}