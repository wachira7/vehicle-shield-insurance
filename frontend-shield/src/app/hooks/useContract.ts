"use client";
import { readContract, writeContract, getPublicClient, type BaseError } from '@wagmi/core';
import { CONTRACT_ADDRESSES } from '../config/constants';
import { InsuranceCoreABI, PolicyNFTABI, RiskAssessmentABI } from '../config/contracts';
import { useCallback } from 'react';
import { config } from '../../config/wagmi';
import { type AbiEvent } from 'viem';

type ContractName = keyof typeof CONTRACT_ADDRESSES;

// Define a base type for contract return values
type ContractReturnType = string | number | boolean | bigint | object | null;

// Add type for contract options
type WriteOptions = {
  value?: bigint;
};

// Define event log type
interface EventLog {
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  args: Record<string, unknown>; // Using Record with unknown instead of any
  timestamp?: bigint;
}

// Define ParsedEventLog type
interface ParsedEventLog {
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
  args: Record<string, unknown>; // Using Record with unknown instead of any
  timestamp?: bigint;
}

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

  const getContractEvents = useCallback(async (
    contractName: ContractName,
    eventName: string,
    filter: Record<string, unknown> = {}
  ): Promise<EventLog[]> => {
    try {
      const publicClient = getPublicClient(config);
      const abi = getContractABI(contractName);
      const contractAddress = CONTRACT_ADDRESSES[contractName];
      
      // Find the event in the ABI
      const eventAbi = abi.find(item => 
        typeof item === 'object' && 
        item !== null && 
        'type' in item && 
        item.type === 'event' && 
        'name' in item && 
        item.name === eventName
      ) as AbiEvent | undefined;
      
      if (!eventAbi) {
        throw new Error(`Event ${eventName} not found in contract ${contractName}`);
      }
      
      // Create filter arguments based on the filter object
      const filterValues: Record<number, unknown> = {};
      
      if (eventAbi.inputs) {
        Object.entries(filter).forEach(([key, value]) => {
          // Find the index of the parameter in the event
          const paramIndex = eventAbi.inputs.findIndex(input => 
            typeof input === 'object' && 
            input !== null && 
            'name' in input && 
            input.name === key
          );
          
          if (paramIndex !== -1) {
            filterValues[paramIndex] = value;
          }
        });
      }
      
      // Get logs
      const logs = await publicClient.getLogs({
        address: contractAddress,
        event: eventAbi,
        args: Object.keys(filterValues).length > 0 ? filterValues : undefined,
        fromBlock: BigInt(0),
        toBlock: 'latest'
      });
      
      return logs as unknown as EventLog[];
    } catch (error) {
      console.error(`Error getting events for ${contractName}.${eventName}:`, error);
      return [];
    }
  }, []);

  // Add this function to help parse event logs (useful for the frontend)
  const parseEventLogs = useCallback((
    logs: EventLog[],
    contractName: ContractName,
    eventName: string
  ): ParsedEventLog[] => {
    try {
      const abi = getContractABI(contractName);
      
      // Find the event in the ABI
      const eventAbi = abi.find(item => 
        typeof item === 'object' &&
        item !== null &&
        'type' in item &&
        item.type === 'event' &&
        'name' in item &&
        item.name === eventName
      ) as AbiEvent | undefined;
      
      if (!eventAbi) {
        throw new Error(`Event ${eventName} not found in contract ${contractName}`);
      }
      
      // Parse logs to extract values in a user-friendly format
      return logs.map(log => {
        const args: Record<string, unknown> = {};
        
        if (eventAbi.inputs && log.args) {
          // Extract named parameters from the log
          eventAbi.inputs.forEach((input, index) => {
            if (typeof input === 'object' && 
                input !== null && 
                'name' in input && 
                input.name && 
                log.args[index] !== undefined) {
              args[input.name] = log.args[index];
            }
          });
        }
        
        return {
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          logIndex: log.logIndex,
          args,
          timestamp: log.timestamp // Note: this might be undefined depending on your viem version
        };
      });
    } catch (error) {
      console.error(`Error parsing event logs for ${contractName}.${eventName}:`, error);
      return [];
    }
  }, []);

  return {
    readFromContract,
    writeToContract,
    getContractEvents,
    parseEventLogs
  };
};