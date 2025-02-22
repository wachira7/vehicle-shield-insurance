"use client"
import { useState } from 'react';
import { useContract } from './useContract';
import { toast } from 'react-hot-toast';
import { parseEther } from 'viem';

// Define interfaces for claim data
interface ClaimData {
    policyId: number;
    description: string;
    photoHash: string;
    amount: bigint;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING';
    timestamp: bigint;
    // Add other fields from your smart contract
}

export const useClaim = () => {
    const { readFromContract, writeToContract } = useContract();
    const [isLoading, setIsLoading] = useState(false);

    const submitClaim = async (
        policyId: number,
        description: string,
        photoHash: string,
        amount: number
    ) => {
        try {
            // Basic validation
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
            const { hash, error } = await writeToContract('InsuranceCore', 'submitClaim', [
                policyId,
                description,
                photoHash,
                parseEther(amount.toString()),
            ]);

            if (error) throw error;
            if (hash) toast.success('Claim submitted successfully');
            
            return { hash, error: null };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to submit claim';
            console.error('Error submitting claim:', error);
            toast.error(message);
            return { hash: null, error };
        } finally {
            setIsLoading(false);
        }
    };

    const getClaimDetails = async (claimId: number) => {
        try {
            const { data, error } = await readFromContract<ClaimData>('InsuranceCore', 'claims', [claimId]);
            if (error) throw error;
            return data;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch claim details';
            console.error('Error fetching claim details:', error);
            toast.error(message);
            return null;
        }
    };

    const getClaimHistory = async (policyId: number) => {
        try {
            const { data, error } = await readFromContract<ClaimData[]>('InsuranceCore', 'getClaimsByPolicy', [policyId]);
            if (error) throw error;
            return data || [];
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch claim history';
            console.error('Error fetching claim history:', error);
            toast.error(message);
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