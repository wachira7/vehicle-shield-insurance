//src/app/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useDashboardData } from '@/app/hooks/userDashboardData';

// UI Components
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Skeleton } from '@/app/components/ui/skeleton';

// Claims Components
import  ClaimSubmission  from '@/app/components/claims/Submission';
import  ClaimsHistory  from '@/app/components/claims/History';
// Policy Components
import  PolicyList  from '@/app/components/policy/List';
import  PolicyManagement  from '@/app/components/policy/Management';
// Vehicle Components
import  VehicleRegistration  from '@/app/components/vehicle/Registration';
import  VehicleDetails  from '@/app/components/vehicle/VehicleDetails';

// Dashboard Components
import DashboardOverview from '@/app/components/dashboard/Overview';
import Stats from '@/app/components/dashboard/Stats';
import ActivityFeed from '@/app/components/dashboard/ActivityFeed';
import PolicyStats from '@/app/components/dashboard/PolicyStats';
import ClaimsList from '@/app/components/dashboard/ClaimsList';
import ActionCard from '@/app/components/dashboard/ActionCard';
import { Plus, FileText, Car } from 'lucide-react';

export default function DashboardPage() {
  const { address } = useAccount();
  const { dashboardData, isLoading, error, activities } = useDashboardData(address);
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

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
      <DashboardOverview userAddress={address} />
      <Stats data={dashboardData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Policy Management</h2>
            <PolicyStats 
              active={dashboardData.activePolicies}
              expiringSoon={0}
              totalCoverage={dashboardData.totalCoverage}
            />
            <PolicyList 
              userAddress={address} 
              onSelectPolicy={setSelectedPolicyId}
            />
            {selectedPolicyId && (
              <PolicyManagement policyId={selectedPolicyId} />
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Claims Management</h2>
            <ClaimsList 
                  claims={activities.filter(a => a.type === 'claim')}
                  onViewClaim={(id: string) => {
                    // Find the claim with this id and set it as selected
                    const selectedClaim = activities.find(a => a.id === id && a.type === 'claim')as unknown as { policyId?: number };
                    if (selectedClaim && selectedClaim.policyId) {
                      setSelectedPolicyId(selectedClaim.policyId);
                    }
                  }}
                />
            {selectedPolicyId && (
              <ClaimSubmission policyId={selectedPolicyId} />
            )}
            {selectedPolicyId && (
              <ClaimsHistory policyId={selectedPolicyId} />
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Vehicle Management</h2>
            {!selectedVehicle ? (
              <VehicleRegistration />
            ) : (
              <VehicleDetails regPlate={selectedVehicle} />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ActionCard 
            title="Quick Actions"
            actions={quickActions}
          />
          <ActivityFeed 
            activities={activities.slice(0, 10)}
          />
        </div>
      </div>
    </div>
  );
}