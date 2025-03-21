// src/app/hooks/useDashboardData.ts
import { useState, useEffect, useCallback } from 'react';
import { usePolicy } from './usePolicy';
import { useVehicle } from './useVehicle';
import { useClaim } from './useClaim';
import { useContract } from './useContract';
import { formatEther } from 'viem';

interface DashboardStats {
  totalPolicies: number;
  activePolicies: number;
  totalVehicles: number;
  totalClaims: number;
  totalCoverage: string;
  expiringSoon: number;
}

interface Activity {
  id: string;
  type: 'policy' | 'claim' | 'vehicle';
  action: string;
  timestamp: Date;
  details: string;
  policyId?: number;
  claimId?: number;
  regPlate?: string;
}

export function useDashboardData(address: string | undefined) {
  const { getUserPolicies, getPolicyDetails } = usePolicy();
  const { getUserVehicles } = useVehicle();
  const { getClaimHistory } = useClaim();
  const { getContractEvents, parseEventLogs } = useContract();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardStats>({
    totalPolicies: 0,
    activePolicies: 0,
    totalVehicles: 0,
    totalClaims: 0,
    totalCoverage: '0',
    expiringSoon: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to trigger a refresh
  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!address) return;

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch data in parallel for better performance
        const [policyIds, vehicles] = await Promise.all([
          getUserPolicies(address),
          getUserVehicles(address)
        ]);

        // Process policies in batches to avoid overwhelming the blockchain
        const batchSize = 5;
        const policyBatches = [];
        for (let i = 0; i < policyIds.length; i += batchSize) {
          policyBatches.push(policyIds.slice(i, i + batchSize));
        }

        // Fetch policy details
        const policies = [];
        const now = new Date();
        let expiringSoon = 0;
        
        for (const batch of policyBatches) {
          const batchPolicies = await Promise.all(
            batch.map(id => getPolicyDetails(id))
          );
          
          // Count policies expiring soon (within 30 days)
          for (const policy of batchPolicies) {
            if (policy && policy.isActive) {
              const daysUntilExpiry = Math.floor((policy.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
                expiringSoon++;
              }
            }
          }
          
          policies.push(...batchPolicies.filter(Boolean));
        }

        // Fetch claims
        const allClaims = await Promise.all(
          policyIds.map(policyId => getClaimHistory(policyId))
        );
        const claims = allClaims.flat();

        // Compute total coverage
        const totalCoverage = policies
          .reduce((sum, policy) => {
            const coverage = typeof policy?.coverage === 'string' 
              ? parseFloat(policy.coverage) 
              : 0;
            return sum + coverage;
          }, 0)
          .toFixed(2);

        // Create activity feed from events
        const activities: Activity[] = [];
        
        // 1. Add claim activities
        if (claims.length > 0) {
          activities.push(...claims.map(claim => ({
            id: `claim-${claim.claimId}`,
            type: 'claim' as const,
            action: `Claim ${claim.status}`,
            timestamp: new Date(Number(claim.timestamp || 0) * 1000),
            details: `Claim for ${formatEther(claim.amount)} ETH`,
            policyId: claim.policyId,
            claimId: claim.claimId
          })));
        }
        
        // 2. Add policy activities
        const policyEvents = await getContractEvents('InsuranceCore', 'PolicyCreated', { owner: address });
        const parsedPolicyEvents = parseEventLogs(policyEvents, 'InsuranceCore', 'PolicyCreated');
        
        activities.push(...parsedPolicyEvents.map(event => ({
          id: `policy-${String(event.args.policyId)}`,
          type: 'policy' as const,
          action: 'Policy Created',
          timestamp: new Date(Number(event.timestamp || 0) * 1000),
          details: `Policy for vehicle ${String(event.args.vehicleId)}`,
          policyId: Number(event.args.policyId)
        })));
        
        // 3. Add vehicle activities
        const vehicleEvents = await getContractEvents('InsuranceCore', 'VehicleRegistered', { owner: address });
        const parsedVehicleEvents = parseEventLogs(vehicleEvents, 'InsuranceCore', 'VehicleRegistered');
        
        activities.push(...parsedVehicleEvents.map(event => ({
          id: `vehicle-${String(event.args.regPlate)}`,
          type: 'vehicle' as const,
          action: 'Vehicle Registered',
          timestamp: new Date(Number(event.timestamp || 0) * 1000),
          details: `Vehicle ${String(event.args.regPlate)} registered`,
          regPlate: String(event.args.regPlate)
        })));
        
        // Sort activities by timestamp (newest first)
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Update state with all data
        setDashboardData({
          totalPolicies: policies.length,
          activePolicies: policies.filter(p => p?.isActive).length,
          totalVehicles: vehicles.length,
          totalClaims: claims.length,
          totalCoverage,
          expiringSoon
        });
        
        setActivities(activities);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(errorMessage);
        console.error('Dashboard data error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [
    address, 
    getUserPolicies, 
    getUserVehicles, 
    getPolicyDetails, 
    getClaimHistory, 
    getContractEvents, 
    parseEventLogs,
    refreshTrigger
  ]);

  return {
    dashboardData,
    isLoading,
    error,
    activities,
    refreshData
  };
}