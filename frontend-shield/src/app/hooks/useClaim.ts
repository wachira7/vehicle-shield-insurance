//src/app/hooks/useClaim.ts
"use client"
import { useState, useCallback, useRef } from 'react';
import { useContract } from './useContract';
import { toast } from 'react-hot-toast';
import { parseEther } from 'viem';

// Define interfaces for claim data
interface ClaimData {
    claimId: number;
    policyId: number;
    description: string;
    photoHash: string;
    amount: bigint;
    isProcessed: boolean;
    isPaid: boolean;
}

export interface FormattedClaimData {
    claimId: number;
    policyId: number;
    description: string;
    photoHash: string;
    amount: bigint;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING';
    timestamp: bigint;
}

export const useClaim = () => {
    const { readFromContract, writeToContract, getContractEvents, parseEventLogs } = useContract();
    const [isLoading, setIsLoading] = useState(false);
    
    // Add caching for claims
    const claimCache = useRef(new Map<number, FormattedClaimData>());

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
            if (hash) {
                toast.success('Claim submitted successfully');
                
                // Clear the claim cache upon successful submission
                claimCache.current.clear();
            }
            
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

    const getClaimDetails = useCallback(async (claimId: number): Promise<FormattedClaimData | null> => {
        try {
            // Check cache first
            if (claimCache.current.has(claimId)) {
                return claimCache.current.get(claimId) || null;
            }
            
            const { data, error } = await readFromContract<ClaimData>('InsuranceCore', 'claims', [claimId]);
            if (error) throw error;
            if (!data) return null;
            
            // Get claim submission event to get timestamp
            const eventLogs = await getContractEvents('InsuranceCore', 'ClaimSubmitted', { claimId });
            const parsedLogs = parseEventLogs(eventLogs, 'InsuranceCore', 'ClaimSubmitted');
            
            // Extract timestamp from event logs or use current time as fallback
            let timestamp = BigInt(0);
            if (parsedLogs.length > 0 && parsedLogs[0].timestamp) {
                timestamp = parsedLogs[0].timestamp;
            } else if (parsedLogs.length > 0 && parsedLogs[0].blockNumber) {
                // If no timestamp, try to estimate from block number (approximate)
                timestamp = parsedLogs[0].blockNumber * BigInt(15); // Assuming ~15 seconds per block
            }
            
            // Determine status based on claim data
            let status: FormattedClaimData['status'] = 'PENDING';
            if (data.isProcessed) {
                if (data.isPaid) {
                    status = 'APPROVED';
                } else {
                    status = 'REJECTED';
                }
            } else {
                status = 'PROCESSING';
            }
            
            const formattedClaim: FormattedClaimData = {
                claimId: data.claimId,
                policyId: data.policyId,
                description: data.description,
                photoHash: data.photoHash,
                amount: data.amount,
                status,
                timestamp
            };
            
            // Cache the result
            claimCache.current.set(claimId, formattedClaim);
            return formattedClaim;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch claim details';
            console.error('Error fetching claim details:', error);
            toast.error(message);
            return null;
        }
    }, [readFromContract, getContractEvents, parseEventLogs]);

    const getClaimHistory = useCallback(async (policyId: number): Promise<FormattedClaimData[]> => {
        try {
            // Try using direct contract call if available
            const { data, error } = await readFromContract<ClaimData[]>('InsuranceCore', 'getClaimsByPolicy', [policyId]);
            
            if (!error && data && data.length > 0) {
                // Format and cache each claim
                const formattedClaims = await Promise.all(
                    data.map(claim => getClaimDetails(claim.claimId))
                );
                return formattedClaims.filter((claim): claim is FormattedClaimData => claim !== null);
            }
            
            // If direct call failed or returned no data, use events
            const eventLogs = await getContractEvents('InsuranceCore', 'ClaimSubmitted', { policyId });
            const parsedLogs = parseEventLogs(eventLogs, 'InsuranceCore', 'ClaimSubmitted');
            
            // Extract claim IDs from event logs
            const claimIds = parsedLogs.map(log => {
                const claimId = log.args.claimId;
                return typeof claimId === 'number' ? claimId : 
                       typeof claimId === 'bigint' ? Number(claimId) :
                       typeof claimId === 'string' ? parseInt(claimId, 10) : 0;
            }).filter(id => id > 0);
            
            // Get details for each claim
            const claims = await Promise.all(
                claimIds.map(claimId => getClaimDetails(claimId))
            );
            
            return claims.filter((claim): claim is FormattedClaimData => claim !== null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch claim history';
            console.error('Error fetching claim history:', error);
            toast.error(message);
            return [];
        }
    }, [readFromContract, getContractEvents, parseEventLogs, getClaimDetails]);

    const getClaimStatus = useCallback(async (claimId: number): Promise<string> => {
        try {
            const claim = await getClaimDetails(claimId);
            return claim?.status || 'UNKNOWN';
        } catch (error) {
            console.error('Error checking claim status:', error);
            return 'UNKNOWN';
        }
    }, [getClaimDetails]);

    return {
        submitClaim,
        getClaimDetails,
        getClaimHistory,
        getClaimStatus,
        isLoading,
    };
};