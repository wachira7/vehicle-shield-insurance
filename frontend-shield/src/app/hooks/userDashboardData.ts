import { useState, useEffect } from 'react';
import { usePolicy } from './usePolicy';
import { useVehicle } from './useVehicle';
import { useClaim } from './useClaim';
import { formatEther } from 'viem';

interface DashboardStats {
  totalPolicies: number;
  activePolicies: number;
  totalVehicles: number;
  totalClaims: number;
  totalCoverage: string;
}

interface Activity {
  id: string;
  type: 'policy' | 'claim' | 'vehicle';
  action: string;
  timestamp: Date;
  details: string;
}

export function useDashboardData(address: string | undefined) {
  const { getUserPolicies, getPolicyDetails } = usePolicy();
  const { getVehicleDetails } = useVehicle();
  const { getClaimHistory } = useClaim();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardStats>({
    totalPolicies: 0,
    activePolicies: 0,
    totalVehicles: 0,
    totalClaims: 0,
    totalCoverage: '0',
  });
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!address) return;

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch user policies
        const policyIds = await getUserPolicies(address);
        const policies = (await Promise.all(
          policyIds.map(id => getPolicyDetails(id))
        )).filter((policy): policy is NonNullable<typeof policy> => policy !== null);

        // Fetch vehicles
        const vehicles = await Promise.all(
          policies
            .filter(policy => policy.regPlate)
            .map(policy => getVehicleDetails(policy.regPlate))
        );

        // Fetch claims
        const allClaims = await Promise.all(
          policies.map(async (policy) => {
            try {
              return await getClaimHistory(policy.policyId); // assuming policy.id is the correct field
            } catch (error) {
              console.error(`Failed to fetch claims for policy: ${error}`);
              return [];
            }
          })
        );
        const claims = allClaims.flat().filter(Boolean);

        // Compute total coverage
        const totalCoverage = policies
          .reduce((sum, policy) => {
            const coverage = typeof policy.coverage === 'string' 
              ? parseFloat(policy.coverage) 
              : Number(formatEther(policy.coverage));
            return sum + coverage;
          }, 0)
          .toFixed(2);

        // Create activity log
        const activitiesList: Activity[] = claims.map(claim => ({
          id: `claim-${claim.claimId}`, // assuming claim.id exists
          type: 'claim',
          action: `Claim ${claim.status}`,
          timestamp: new Date(Number(claim.timestamp)),
          details: `Claim for ${formatEther(claim.amount)} ETH`,
        }));

        // Sort activities
        activitiesList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Update state
        setDashboardData({
          totalPolicies: policies.length,
          activePolicies: policies.filter(p => p.isActive).length,
          totalVehicles: vehicles.filter(Boolean).length,
          totalClaims: claims.length,
          totalCoverage,
        });

        setActivities(activitiesList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [address, getUserPolicies, getPolicyDetails, getVehicleDetails, getClaimHistory]);

  return {
    dashboardData,
    isLoading,
    error,
    activities,
  };
}