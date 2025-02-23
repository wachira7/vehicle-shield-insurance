'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePolicy } from '@/hooks/usePolicy';
import { useVehicle } from './hooks/useVehicle';
import { useClaim } from './hooks/useClaim';

// UI Components
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// Claims Components
import  {ClaimSubmission, ClaimsHistory }  from '@/components/claims';
// Policy Components
import  {PolicyList, PolicyManagement }  from '@/app/components/policy';
// Vehicle Components
import  {VehicleRegistration, VehicleDetails}  from '@/app/components/vehicle';
// Dashboard Components
import DashboardOverview from '@/app/components/dashboard/Overview';
import Stats from '@/app/components/dashboard/Stats';
import ActivityFeed from '@/app/components/dashboard/ActivityFeed';
import PolicyStats from '@/app/components/dashboard/PolicyStats';
import ClaimsList from '@/app/components/dashboard/ClaimsList';
import ActionCard from '@/app/components/dashboard/ActionCard';
import { Plus, FileText, Car } from 'lucide-react';

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

export default function DashboardPage() {
  const { address } = useAccount();
  const { getUserPolicies, getPolicyDetails } = usePolicy();
  const { getVehicleDetails } = useVehicle();
  const { getClaimHistory } = useClaim();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalPolicies: 0,
    activePolicies: 0,
    totalVehicles: 0,
    totalClaims: 0,
    totalCoverage: '0'
  });
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!address) return;
      
      try {
        setIsLoading(true);
        setError(null);

        // Fetch policies
        const policyIds = await getUserPolicies(address);
        const policies = await Promise.all(
          policyIds.map(id => getPolicyDetails(id))
        );

        // Fetch vehicles
        const vehicles = await Promise.all(
          policies
            .filter(policy => policy?.regPlate)
            .map(policy => getVehicleDetails(policy.regPlate))
        );

        // Fetch claims
        const claims = await Promise.all(
          policies.map(policy => getClaimHistory(policy.policyId))
        ).then(claims => claims.flat());

        // Calculate stats
        const activePolicies = policies.filter(p => p.isActive).length;
        const totalCoverage = policies.reduce(
          (sum, p) => sum + parseFloat(p.coverage), 0
        ).toString();

        setDashboardStats({
          totalPolicies: policies.length,
          activePolicies,
          totalVehicles: vehicles.length,
          totalClaims: claims.length,
          totalCoverage
        });

        // Generate activities from recent events
        const recentActivities: Activity[] = [
          ...claims.map(claim => ({
            id: `claim-${claim.id}`,
            type: 'claim' as const,
            action: `Claim ${claim.status}`,
            timestamp: new Date(Number(claim.timestamp) * 1000),
            details: `Claim for ${claim.amount} ETH`
          })),
          // Add policy and vehicle activities here
        ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setActivities(recentActivities);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [address, getUserPolicies, getPolicyDetails, getVehicleDetails, getClaimHistory]);

  const quickActions = [
    {
      id: 'new-policy',
      title: 'Create New Policy',
      description: 'Set up insurance for your vehicle',
      icon: Plus,
      onClick: () => setSelectedPolicyId(null)
    },
    {
      id: 'submit-claim',
      title: 'Submit Claim',
      description: 'File a new insurance claim',
      icon: FileText,
      onClick: () => setSelectedPolicyId(1)
    },
    {
      id: 'register-vehicle',
      title: 'Register Vehicle',
      description: 'Add a new vehicle to your account',
      icon: Car,
      onClick: () => setSelectedVehicle(null)
    }
  ];

  if (!address) {
    return (
      <Alert>
        <AlertDescription>
          Please connect your wallet to view the dashboard
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Dashboard Overview Section */}
      <DashboardOverview userAddress={address} />

      {/* Stats Overview */}
      <Stats data={dashboardStats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Policy Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Policy Management</h2>
            <PolicyStats 
              active={dashboardStats.activePolicies}
              expiringSoon={0}
              totalCoverage={dashboardStats.totalCoverage}
            />
            <PolicyList 
              userAddress={address} 
              onSelectPolicy={setSelectedPolicyId}
            />
            {selectedPolicyId && (
              <PolicyManagement policyId={selectedPolicyId} />
            )}
          </section>

          {/* Claims Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Claims Management</h2>
            <ClaimsList 
              claims={activities.filter(a => a.type === 'claim')}
              onViewClaim={(id) => {/* Handle claim selection */}}
            />
            {selectedPolicyId && (
              <ClaimSubmission policyId={selectedPolicyId} />
            )}
            {selectedPolicyId && (
              <ClaimHistory policyId={selectedPolicyId} />
            )}
          </section>

          {/* Vehicle Section */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Vehicle Management</h2>
            {!selectedVehicle ? (
              <VehicleRegistration />
            ) : (
              <VehicleDetails regPlate={selectedVehicle} />
            )}
          </section>
        </div>

        {/* Right Column - Actions & Activity */}
        <div className="space-y-6">
          <ActionCard 
            title="Quick Actions"
            actions={quickActions}
          />
          <ActivityFeed 
            activities={activities.slice(0, 10)} // Show only last 10 activities
          />
        </div>
      </div>
    </div>
  );
}