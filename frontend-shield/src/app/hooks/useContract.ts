"use client";
import { readContract, writeContract, type BaseError } from '@wagmi/core';
import { CONTRACT_ADDRESSES } from '../config/constants';
import { InsuranceCoreABI, PolicyNFTABI, RiskAssessmentABI } from '../config/contracts';
import { useCallback } from 'react';
import { config } from '../../config/wagmi';

type ContractName = keyof typeof CONTRACT_ADDRESSES;

// Define a base type for contract return values
type ContractReturnType = string | number | boolean | bigint | object | null;

// Add type for contract options
type WriteOptions = {
  value?: bigint;
};

const getContractABI = (contractName: ContractName) => {
  switch (contractName) {
    case 'InsuranceCore':
      return InsuranceCoreABI;
    case 'PolicyNFT':
      return PolicyNFTABI;
    case 'RiskAssessment':
      return RiskAssessmentABI;
    default:
      throw new Error(`Invalid contract name: ${contractName}`);
  }
};

export const useContract = () => {
  const readFromContract = async <T extends ContractReturnType>(
    contractName: ContractName,
    functionName: string,
    args: unknown[] = []
  ) => {
    try {
      const data = await readContract(config, {
        address: CONTRACT_ADDRESSES[contractName],
        abi: getContractABI(contractName),
        functionName,
        args,
      }) as T;
      return { data, error: null };
    } catch (error) {
      console.error(`Error reading from ${contractName}:`, error);
      return { data: null, error: error as BaseError };
    }
  };

  const writeToContract = useCallback(async (
    contractName: ContractName,
    functionName: string,
    args: unknown[] = [],
    options?: WriteOptions  // Add options parameter
  ) => {
    try {
      const hash = await writeContract(config, {
        address: CONTRACT_ADDRESSES[contractName],
        abi: getContractABI(contractName),
        functionName,
        args,
        value: options?.value  // Use value from options
      });

      return { hash, error: null };
    } catch (error) {
      console.error(`Error writing to ${contractName}:`, error);
      return { hash: null, error: error as BaseError };
    }
  }, []);

  return {
    readFromContract,
    writeToContract,
  };
};