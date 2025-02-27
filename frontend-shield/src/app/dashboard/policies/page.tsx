'use client';import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { usePolicy } from '@/app/hooks/usePolicy';
import { useVehicle } from '@/app/hooks/useVehicle';
import PolicyManagement from '@/app/components/policy/Management';
import PolicyCreation from '@/app/components/policy/Creation';
import { Shield, Plus, Car } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Define interfaces for vehicle and policy data
interface VehicleDetails {
  regPlate: string;
  make: string;
  model: string;
  year: number;
  baseValue: bigint;
  mileage: number;
  condition: number;
  hasAccidentHistory: boolean;
  isRegistered: boolean;
}

interface FormattedPolicyData {
  regPlate: string;
  coverage: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  owner: string;
  policyId: number;
  premium?: string;
  vehicleDetails?: VehicleDetails | null | undefined;
}

export default function PoliciesPage() {
  const { address } = useAccount();
  const { getUserPolicies, getPolicyDetails } = usePolicy();
  const { getVehicleDetails } = useVehicle();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [policies, setPolicies] = useState<FormattedPolicyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for vehicle param in URL for direct policy creation
  const searchParams = useSearchParams();
  const vehicleParam = searchParams.get('vehicle');
  
  // Fetch user's policies with vehicle details
  useEffect(() => {
    const fetchPoliciesWithVehicleDetails = async () => {
      if (!address) return;
      
      setIsLoading(true);
      try {
        // Get all policy IDs for the user
        const ids = await getUserPolicies(address);
        
        // Fetch details for each policy
        const policyDetails = await Promise.all(
          ids.map(id => getPolicyDetails(id))
        );
        
        // Filter out null values
        const validPolicies = policyDetails.filter(policy => policy !== null) as FormattedPolicyData[];
        
        // Fetch vehicle details for each policy
        const policiesWithVehicles = await Promise.all(
          validPolicies.map(async (policy) => {
            try {
              const vehicleDetails = await getVehicleDetails(policy.regPlate);
              return {
                ...policy,
                vehicleDetails: vehicleDetails ??  undefined,
              };
            } catch (error) {
              console.error(`Error fetching vehicle details for ${policy.regPlate}:`, error);
              return { ...policy, vehicleDetails: null as null };
            }
          })
        );
        
        setPolicies(policiesWithVehicles as FormattedPolicyData[]);
      } catch (error) {
        console.error('Error fetching policies:', error);
        toast.error('Failed to load your policies');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPoliciesWithVehicleDetails();
  }, [address, getUserPolicies, getPolicyDetails, getVehicleDetails]);
  
  // Check for vehicle param and switch to creation tab if found
  useEffect(() => {
    if (vehicleParam) {
      setActiveTab('create');
    }
  }, [vehicleParam]);
  
  // Handle policy selection
  const handleSelectPolicy = (policyId: number) => {
    setSelectedPolicyId(policyId);
    setActiveTab('details');
  };
  
  // Handle policy creation success
  const handlePolicyCreated = () => {
    // Refetch policies to update the list
    if (address) {
      const fetchUpdatedPolicies = async () => {
        try {
          const ids = await getUserPolicies(address);
          // Fetch the newest policy and add it to the list
          if (ids.length > 0) {
            const newestId = Math.max(...ids);
            const policy = await getPolicyDetails(newestId);
            if (policy) {
              setPolicies(prev => [...prev, policy]);
              setSelectedPolicyId(newestId);
              setActiveTab('details');
            }
          }
        } catch (error) {
          console.error("Error fetching updated policies:", error);
        }
      };
      
      fetchUpdatedPolicies();
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Policy Management</h1>
        <Button 
          onClick={() => setActiveTab('create')} 
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Policy
        </Button>
      </div>
      
      {/* Policy Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Active Policies</p>
              <h3 className="text-2xl font-bold mt-1">
                {isLoading ? '...' : policies.filter(p => p.isActive).length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Total Coverage</p>
              <h3 className="text-2xl font-bold mt-1">
                {isLoading ? '...' : `${policies.reduce((sum, policy) => sum + parseFloat(policy.coverage), 0).toFixed(2)} ETH`}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
              <h3 className="text-2xl font-bold mt-1">
                {isLoading ? '...' : policies.filter(p => {
                  const daysUntilExpiry = Math.floor((p.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return p.isActive && daysUntilExpiry <= 30;
                }).length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">My Policies</TabsTrigger>
          {selectedPolicyId && <TabsTrigger value="details">Policy Details</TabsTrigger>}
          <TabsTrigger value="create">Create Policy</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Your Insurance Policies</CardTitle>
              <CardDescription>View and manage your insurance coverage</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : policies.length > 0 ? (
                <div className="grid gap-4">
                  {policies.map(policy => (
                    <Card key={policy.policyId} className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleSelectPolicy(policy.policyId)}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-4">
                            <div className="bg-blue-100 rounded-full p-3">
                              <Shield className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">Policy #{policy.policyId}</h3>
                              <p className="text-sm text-gray-500">
                                Vehicle: {policy.regPlate}
                                {policy.vehicleDetails && ` - ${policy.vehicleDetails.make} ${policy.vehicleDetails.model}`}
                              </p>
                            </div>
                          </div>
                          <div>
                            <div className={`px-2 py-1 rounded-full text-xs ${policy.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {policy.isActive ? 'Active' : 'Inactive'}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Expires: {policy.endDate.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Policies Found</h3>
                  <p className="text-gray-500 mb-4">Create your first policy to protect your vehicle</p>
                  <Button onClick={() => setActiveTab('create')}>Create Policy</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details">
          {selectedPolicyId && (
            <Card>
              <CardHeader>
                <CardTitle>Policy Details</CardTitle>
                <CardDescription>Manage your insurance policy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Find the selected policy */}
                {policies.find(p => p.policyId === selectedPolicyId) && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                    <div className="flex items-start">
                      {policies.find(p => p.policyId === selectedPolicyId)?.vehicleDetails ? (
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center">
                            <Car className="h-5 w-5 text-blue-600 mr-2" />
                            <h3 className="font-medium text-blue-800">Vehicle Information</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {(() => {
                              const policy = policies.find(p => p.policyId === selectedPolicyId);
                              const vehicle = policy?.vehicleDetails;
                              if (!vehicle) return null;
                              
                              return (
                                <>
                                  <div>
                                    <span className="text-blue-700">Registration:</span> {vehicle.regPlate}
                                  </div>
                                  <div>
                                    <span className="text-blue-700">Make & Model:</span> {vehicle.make} {vehicle.model}
                                  </div>
                                  <div>
                                    <span className="text-blue-700">Year:</span> {vehicle.year}
                                  </div>
                                  <div>
                                    <span className="text-blue-700">Mileage:</span> {vehicle.mileage.toLocaleString()} miles
                                  </div>
                                  <div>
                                    <span className="text-blue-700">Condition:</span> {vehicle.condition}/10
                                  </div>
                                  <div>
                                    <span className="text-blue-700">Accident History:</span> {vehicle.hasAccidentHistory ? 'Yes' : 'No'}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-blue-700">Loading vehicle details...</div>
                      )}
                    </div>
                  </div>
                )}
                
                <PolicyManagement policyId={selectedPolicyId} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Policy</CardTitle>
              <CardDescription>Protect your vehicle with blockchain-based insurance</CardDescription>
            </CardHeader>
            <CardContent>
              <PolicyCreation 
                vehicleRegPlate={vehicleParam || ''} 
                onSuccess={handlePolicyCreated}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}