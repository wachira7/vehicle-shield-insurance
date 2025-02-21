import { useState } from 'react';
import { useContract } from './useContract';
import { toast } from 'react-hot-toast';
import { parseEther } from 'viem';


export const useClaim = () => {
    const { getContractWrite, getContractRead } = useContract();
    const [isLoading, setIsLoading] = useState(false);

    const submitClaim = async (
        policyId: number,
        description: string,
        photoHash: string,
        amount: number
    ) => {
        try {
            
            // Add basic validation
            if (!description.trim()) {
                throw new Error('Description is required');
            }
            if (!photoHash.trim()) {
                throw new Error('Photo evidence is required');
            }
            if (amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            setIsLoading(true);
            const { data } = getContractWrite('InsuranceCore', 'submitClaim', [
                policyId,
                description,
                photoHash,
                parseEther(amount.toString()),
            ]);

            if (data && typeof data === 'object' && 'write' in data) {
                const { write } = data;
                if (write && typeof write === 'function') {
                    await (write as () => Promise<void>)();
                    toast.success('Claim submitted successfully');
                }
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error submitting claim:', error);
                toast.error(error.message);
            } else {
                console.error('Unknown error submitting claim:', error);
                toast.error('Failed to submit claim');
            }

       
        } finally {
            setIsLoading(false);
        }
    };

    const getClaimDetails = async (claimId: number) => {
        try {
            const result = await getContractRead('InsuranceCore', 'claims', [claimId]);
            return result.data;
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error fetching claim details:', error);
                toast.error(error.message);
            } else {
                console.error('Unknown error fetching claim details:', error);
                toast.error('Failed to fetch claim details');
            }
            return null;
        }
    };

    const getClaimHistory = async (policyId: number) => {
        try {
            const result = await getContractRead('InsuranceCore', 'getClaimsByPolicy', [policyId]);
            return result.data;
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error fetching claim history:', error);
                toast.error(error.message);
            } else {
                console.error('Unknown error fetching claim history:', error);
                toast.error('Failed to fetch claim history');
            }
            return [];
        }
    };

    return {
        submitClaim,
        getClaimDetails,
        getClaimHistory,
        isLoading,
    };
};