//src/app/hooks/usePolicy.ts
"use client";
import { useState, useCallback, useRef } from 'react';
import { useContract } from './useContract';
import { INSURANCE_CONSTANTS } from '../config/constants';
import { toast } from 'react-hot-toast';
import { parseEther, formatEther } from 'viem';

// Define interfaces for policy data
interface PolicyData {
    regPlate: string;
    coverage: bigint;
    startDate: bigint;
    endDate: bigint;
    isActive: boolean;
    owner: string;      
    policyId: number;   
    premium: bigint;
    // Add other fields from your smart contract
}

export interface FormattedPolicyData {
    regPlate: string;
    coverage: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    owner: string;
    policyId: number;
    // Add other fields
}

export const usePolicy = () => {
    const { readFromContract, writeToContract, getContractEvents, parseEventLogs } = useContract();
    const [isLoading, setIsLoading] = useState(false);
    // Add caching to optimize performance
    const policyCache = useRef(new Map<number, FormattedPolicyData>());

    const createPolicy = async (
        regPlate: string,
        duration: number,
        coverage: string,
        premium: string
    ) => {
        try {
            setIsLoading(true);
            
            // Validate inputs
            if (duration < INSURANCE_CONSTANTS.MIN_DURATION || 
                duration > INSURANCE_CONSTANTS.MAX_DURATION) {
                throw new Error(`Duration must be between ${INSURANCE_CONSTANTS.MIN_DURATION} and ${INSURANCE_CONSTANTS.MAX_DURATION} days`);
            }
    
            const coverageEth = parseFloat(coverage);
            if (coverageEth < parseFloat(INSURANCE_CONSTANTS.MIN_COVERAGE) || 
                coverageEth > parseFloat(INSURANCE_CONSTANTS.MAX_COVERAGE)) {
                throw new Error(`Coverage must be between ${INSURANCE_CONSTANTS.MIN_COVERAGE} and ${INSURANCE_CONSTANTS.MAX_COVERAGE} ETH`);
            }
    
            const durationInSeconds = Number(duration) * 24 * 60 * 60;
    
            const { hash, error } = await writeToContract(
                'InsuranceCore',
                'createPolicy',
                [
                    regPlate,
                    durationInSeconds.toString(),
                    parseEther(coverage),
                ],
                { value: parseEther(premium) }
            );
    
            if (error) throw error;
            if (hash) toast.success('Policy created successfully');
            
            // Clear cache on successful policy creation
            policyCache.current.clear();
            
            return { hash, error: null };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create policy';
            console.error('Error creating policy:', error);
            toast.error(message);
            return { hash: null, error };
        } finally {
            setIsLoading(false);
        }
    };

    const getPolicyDetails = useCallback(async (policyId: number): Promise<FormattedPolicyData | null> => {
        try {
            // Check cache first
            if (policyCache.current.has(policyId)) {
                return policyCache.current.get(policyId) || null;
            }
            
            const { data, error } = await readFromContract<PolicyData>('InsuranceCore', 'policies', [policyId]);
            if (error) throw error;
            
            // Get additional data from the PolicyNFT contract
            const { data: nftData } = await readFromContract<{ vehicleId: string }>('PolicyNFT', 'getPolicyMetadata', [policyId]);
            const { data: owner } = await readFromContract<string>('PolicyNFT', 'getPolicyOwner', [policyId]);
            
            if (data) {
                const formattedPolicy: FormattedPolicyData = {
                    regPlate: nftData?.vehicleId || '',
                    coverage: formatEther(data.coverage),
                    startDate: new Date(Number(data.startDate) * 1000),
                    endDate: new Date(Number(data.endDate) * 1000),
                    isActive: data.isActive,
                    owner: owner || '',
                    policyId
                };
                
                // Cache the result
                policyCache.current.set(policyId, formattedPolicy);
                return formattedPolicy;
            }
            return null;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch policy details';
            console.error('Error fetching policy details:', error);
            toast.error(message);
            return null;
        }
    }, [readFromContract]);

    const getUserPolicies = useCallback(async (address: string): Promise<number[]> => {
        try {
          // Only use the event-based approach since getPolicyByOwner doesn't exist
          const eventLogs = await getContractEvents(
            'InsuranceCore',
            'PolicyCreated',
            { owner: address }
          );
          
          if (!eventLogs || eventLogs.length === 0) {
            return [];
          }
          
          const parsedLogs = parseEventLogs(eventLogs, 'InsuranceCore', 'PolicyCreated');
          
          // Extract policy IDs from event logs
          return parsedLogs.map(log => {
            const policyId = log.args.policyId;
            return typeof policyId === 'number' ? policyId : 
                   typeof policyId === 'bigint' ? Number(policyId) :
                   typeof policyId === 'string' ? parseInt(policyId, 10) : 0;
          }).filter(id => id > 0);
          
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch user policies';
          console.error('Error fetching user policies:', error);
          toast.error(message);
          return [];
        }
      }, [getContractEvents, parseEventLogs]);
    
    const calculatePremium = useCallback(async (regPlate: string, tier: number): Promise<string> => {
        try {
            const { data, error } = await readFromContract<bigint>('RiskAssessment', 'calculatePremium', [regPlate, tier]);
            if (error) throw error;
            return formatEther(data || BigInt(0));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to calculate premium';
            console.error('Error calculating premium:', error);
            toast.error(message);
            return '0';
        }
    }, [readFromContract]);

    const getPolicyStatus = useCallback(async (policyId: number): Promise<'active' | 'expired' | 'pending' | 'unknown'> => {
        try {
            const policy = await getPolicyDetails(policyId);
            if (!policy) return 'unknown';
            
            if (!policy.isActive) return 'expired';
            
            const now = new Date();
            if (policy.startDate > now) return 'pending';
            if (policy.endDate < now) return 'expired';
            
            return 'active';
        } catch (error) {
            console.error('Error getting policy status:', error);
            return 'unknown';
        }
    }, [getPolicyDetails]);

    return {
        createPolicy,
        getPolicyDetails,
        getUserPolicies,
        calculatePremium,
        getPolicyStatus,
        isLoading
    };
};