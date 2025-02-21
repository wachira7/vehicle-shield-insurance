  import {  useContractRead, useContractWrite  } from 'wagmi';
  import { CONTRACT_ADDRESSES } from '../config/constants';
  import { InsuranceCoreABI, PolicyNFTABI, RiskAssessmentABI } from '../config/contracts';
  
  const getContractABI = (contractName: keyof typeof CONTRACT_ADDRESSES) => {
      switch (contractName) {
          case 'InsuranceCore':
              return InsuranceCoreABI;
          case 'PolicyNFT':
              return PolicyNFTABI;
          case 'RiskAssessment':
              return RiskAssessmentABI;
          default:
              throw new Error('Invalid contract name');
      }
  };
  
  export const useContract = () => {
      const getContractRead = (
          contractName: keyof typeof CONTRACT_ADDRESSES,
          functionName: string,
          args?: unknown[]
      ) => {
          return useContractRead({
              address: CONTRACT_ADDRESSES[contractName],
              abi: getContractABI(contractName),
              functionName,
              args,
          });
      };
  
      const getContractWrite = (
          contractName: keyof typeof CONTRACT_ADDRESSES,
          functionName: string,
          args?: unknown[]
      ) => {
          return useContractWrite({
              address: CONTRACT_ADDRESSES[contractName],
              abi: getContractABI(contractName),
              functionName,
              args,
          });
      };
  
      return {
          getContractRead,
          getContractWrite,
      };
  };