import { useState } from 'react';
import { useContract } from './useContract';
import { INSURANCE_CONSTANTS } from '../config/constants';
import { toast } from 'react-hot-toast';
import { parseEther, formatEther } from 'viem';

export const usePolicy = () => {
    const { getContractWrite, getContractRead } = useContract();
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

            const durationInSeconds = Number(duration) * 24 * 60 * 60; // Convert days to seconds

            const { data } = getContractWrite(
                'InsuranceCore',
                'createPolicy',
                [
                    regPlate,
                    durationInSeconds.toString(), // Use string instead of BigInt
                    parseEther(coverage)
                ],
                { value: parseEther(premium) }
            );

            if (data && typeof data === 'object' && 'write' in data) {
                const { write } = data;
                if (write && typeof write === 'function') {
                    await (write as () => Promise<void>)();
                    toast.success('Policy created successfully');
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error creating policy:', error);
                toast.error(error.message);
            } else {
                console.error('Unknown error creating policy:', error);
                toast.error('Failed to create policy');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const getPolicyDetails = async (policyId: number) => {
        try {
            const result = await getContractRead('InsuranceCore', 'policies', [policyId]);
            if (result.data) {
                return {
                    ...result.data,
                    coverage: formatEther(result.data.coverage),
                    startDate: new Date(Number(result.data.startDate) * 1000),
                    endDate: new Date(Number(result.data.endDate) * 1000)
                };
            }
            return null;
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error fetching policy details:', error);
                toast.error(error.message);
            } else {
                console.error('Unknown error fetching policy details:', error);
                toast.error('Failed to fetch policy details');
            }
            return null;
        }
    };

    const getUserPolicies = async (address: string) => {
        try {
            const result = await getContractRead('PolicyNFT', 'getPolicyByOwner', [address]);
            return result.data || [];
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error fetching user policies:', error);
                toast.error(error.message);
            } else {
                console.error('Unknown error fetching user policies:', error);
                toast.error('Failed to fetch user policies');
            }
            return [];
        }
    };

    const calculatePremium = async (regPlate: string, tier: number) => {
        try {
            const result = await getContractRead('RiskAssessment', 'calculatePremium', [regPlate, tier]);
            return formatEther(result.data || '0');
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error calculating premium:', error);
                toast.error(error.message);
            } else {
                console.error('Unknown error calculating premium:', error);
                toast.error('Failed to calculate premium');
            }
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