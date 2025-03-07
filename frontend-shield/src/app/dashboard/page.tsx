//src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useDashboardData } from '@/app/hooks/userDashboardData';

// UI Components
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ConnectButton } from '@/app/components/Wallet/ConnectButton';

// Claims Components
import ClaimSubmission from '@/app/components/claims/Submission';
import ClaimsHistory from '@/app/components/claims/History';
// Policy Components
import PolicyList from '@/app/components/policy/List';
import PolicyManagement from '@/app/components/policy/Management';
// Vehicle Components
import VehicleRegistration from '@/app/components/vehicle/Registration';
import VehicleDetails from '@/app/components/vehicle/VehicleDetails';

// Dashboard Components
import DashboardOverview from '@/app/components/dashboard/Overview';
import Stats from '@/app/components/dashboard/Stats';
import ActivityFeed from '@/app/components/dashboard/ActivityFeed';
import PolicyStats from '@/app/components/dashboard/PolicyStats';
import ClaimsList from '@/app/components/dashboard/ClaimsList';
import ActionCard from '@/app/components/dashboard/ActionCard';
import { Plus, FileText, Car, Info, Shield } from 'lucide-react';

export default function DashboardPage() {
  // Client-side hydration handling
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { address, isConnected } = useAccount();
  const { dashboardData, isLoading, error, activities } = useDashboardData(address || "");
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

  // Don't render anything meaningful until after client-side hydration
  if (!mounted) {
    return null;
  }

  // Public dashboard content for non-connected users
  if (!isConnected) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-5 w-5 text-blue-600" />
          <AlertTitle>Welcome to VehicleShield Dashboard</AlertTitle>
          <AlertDescription>
            Connect your wallet to access your personal insurance data, manage policies, and file claims.
          </AlertDescription>
          <div className="mt-4">
            <ConnectButton className="bg-blue-600 hover:bg-blue-700" />
          </div>
        </Alert>

        {/* Public dashboard content - platform statistics */}
        <h2 className="text-2xl font-bold">Platform Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Policies</CardTitle>
              <CardDescription>Total coverage on platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">2,345</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Claims Processed</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">187</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Average Premium</CardTitle>
              <CardDescription>Monthly cost</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0.15 ETH</div>
            </CardContent>
          </Card>
        </div>

        {/* Feature highlights */}
        <h2 className="text-2xl font-bold mt-8">Our Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Decentralized Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Blockchain-backed insurance policies with transparent terms and conditions.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Easy Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Submit and track claims directly through our dashboard with minimal paperwork.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Car className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Vehicle Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Register multiple vehicles and manage all your policies in one place.</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card className="mt-8 bg-gradient-to-r from-blue-500 to-blue-700 text-white">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-center mb-6">Connect your wallet now to explore your personalized dashboard.</p>
            <ConnectButton className="bg-white text-blue-700 hover:bg-gray-100" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
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

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Convert the Ethereum address to a string to satisfy TypeScript
  const userAddressString = address as string;

  // Connected user dashboard
  return (
    <div className="container mx-auto p-6 space-y-8">
      <DashboardOverview userAddress={userAddressString} />
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
              userAddress={userAddressString}
            />
            <PolicyList 
              userAddress={userAddressString} 
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
              <ClaimsHistory 
                policyId={selectedPolicyId} 
                onSelectClaim={(claimId: number) => console.log(`Claim ${claimId} selected`)}/>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Vehicle Management</h2>
            {!selectedVehicle ? (
              <VehicleRegistration 
                onSuccess={(regPlate: string) => console.log(`Vehicle registered with plate ${regPlate}`)}/>
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