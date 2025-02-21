//usePolicy.ts
"use client";
import { useState } from 'react';
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

interface FormattedPolicyData {
    regPlate: string;
    coverage: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    // Add other fields
}
export const usePolicy = () => {
    const { readFromContract, writeToContract } = useContract();
    const [isLoading, setIsLoading] = useState(false);

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
                //options object
                { value: parseEther(premium) }
            );
    
            if (error) throw error;
            if (hash) toast.success('Policy created successfully');
            
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

    const getPolicyDetails = async (policyId: number): Promise<FormattedPolicyData | null> => {
        try {
            const { data, error } = await readFromContract<PolicyData>('InsuranceCore', 'policies', [policyId]);
            if (error) throw error;
            if (data) {
                return {
                    ...data,
                    coverage: formatEther(data.coverage),
                    startDate: new Date(Number(data.startDate) * 1000),
                    endDate: new Date(Number(data.endDate) * 1000)
                };
            }
            return null;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch policy details';
            console.error('Error fetching policy details:', error);
            toast.error(message);
            return null;
        }
    };

    const getUserPolicies = async (address: string): Promise<number[]> => {
        try {
            const { data, error } = await readFromContract<number[]>('PolicyNFT', 'getPolicyByOwner', [address]);
            if (error) throw error;
            return data || [];
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch user policies';
            console.error('Error fetching user policies:', error);
            toast.error(message);
            return [];
        }
    };
    
    const calculatePremium = async (regPlate: string, tier: number): Promise<string> => {
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
    };

    return {
        createPolicy,
        getPolicyDetails,
        getUserPolicies,
        calculatePremium,
        isLoading
    };
};