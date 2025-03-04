//src/app/dashboard/claims/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { usePolicy } from '@/app/hooks/usePolicy';
import { useClaim } from '@/app/hooks/useClaim';
import ClaimSubmission from '@/app/components/claims/Submission';
import ClaimsHistory from '@/app/components/claims/History';
import ClaimStatus from '@/app/components/claims/Status';
import { WalletCheck } from '@/app/components/Wallet/WalletCheck';
import { FileText, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatEther } from 'viem';

// Define interfaces based on your contract data structure
interface PolicyWithClaims {
  policyId: number;
  regPlate: string;
  coverage: string;
  isActive: boolean;
  claims: ClaimData[];
}

interface ClaimData {
  policyId: number;
  description: string;
  photoHash: string;
  amount: bigint;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING';
  timestamp: bigint;
  claimId: number;
}

export default function ClaimsPage() {
  const { address } = useAccount();
  const { getUserPolicies, getPolicyDetails } = usePolicy();
  const { getClaimHistory, getClaimDetails } = useClaim();
  const [activeTab, setActiveTab] = useState('history');
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [policiesWithClaims, setPoliciesWithClaims] = useState<PolicyWithClaims[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch user's policies and claims
  useEffect(() => {
    const fetchPoliciesAndClaims = async () => {
      if (!address) return;
      
      setIsLoading(true);
      try {
        // Get all policy IDs for the user
        const policyIds = await getUserPolicies(address);
        
        // For each policy, get details and claims
        const policiesData = await Promise.all(
          policyIds.map(async (policyId) => {
            const policy = await getPolicyDetails(policyId);
            if (!policy) return null;
            
            const claims = await getClaimHistory(policyId);
            
            return {
              policyId,
              regPlate: policy.regPlate,
              coverage: policy.coverage,
              isActive: policy.isActive,
              claims
            };
          })
        );
        
        // Filter out null policies and set state
        setPoliciesWithClaims(policiesData.filter(Boolean) as PolicyWithClaims[]);
      } catch (error) {
        console.error('Error fetching policies and claims:', error);
        toast.error('Failed to load your claims data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPoliciesAndClaims();
  }, [address, getUserPolicies, getPolicyDetails, getClaimHistory]);
  
  // Calculate claim statistics
  const claimStats = {
    total: policiesWithClaims.reduce((sum, policy) => sum + policy.claims.length, 0),
    pending: policiesWithClaims.reduce((sum, policy) => 
      sum + policy.claims.filter(claim => claim.status === 'PENDING').length, 0),
    approved: policiesWithClaims.reduce((sum, policy) => 
      sum + policy.claims.filter(claim => claim.status === 'APPROVED').length, 0),
    totalAmount: policiesWithClaims.reduce((sum, policy) => 
      policy.claims.reduce((policySum, claim) => 
        claim.status === 'APPROVED' ? policySum + BigInt(claim.amount) : policySum, 
      BigInt(0)) + sum, 
    BigInt(0))
  };
  
  // Handle claim selection
  const handleSelectClaim = async (claimId: number) => {
    setSelectedClaimId(claimId);
    
    // Find the policy that contains this claim
    for (const policy of policiesWithClaims) {
      const claim = policy.claims.find(c => c.claimId === claimId);
      if (claim) {
        setSelectedPolicyId(policy.policyId);
        break;
      }
    }
  };
  
  // Handle claim submission
  const handleClaimSubmitted = async (policyId: number, claimId: number) => {
    try {
      // Get the claim details
      const claimDetails = await getClaimDetails(claimId);
      if (!claimDetails) return;
      
      // Find the policy in our list
      const policyIndex = policiesWithClaims.findIndex(p => p.policyId === policyId);
      if (policyIndex === -1) return;
      
      // Add the new claim to that policy
      const updatedPolicies = [...policiesWithClaims];
      updatedPolicies[policyIndex].claims.push(claimDetails);
      setPoliciesWithClaims(updatedPolicies);
      
      // Select the newly created claim
      setSelectedClaimId(claimId);
      setActiveTab('status');
    } catch (error) {
      console.error('Error handling claim submission:', error);
    }
  };
  
  // Get all claims across all policies
  const allClaims = policiesWithClaims.flatMap(policy => 
    policy.claims.map(claim => ({
      ...claim,
      regPlate: policy.regPlate
    }))
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Claims Management</h1>
         <ul>
          {allClaims.map((claim, index) => (
            <li key={index}>
               <Button onClick={() => handleSelectClaim(claim.claimId)}>
                  {claim.description}
               </Button>
            </li>
          ))}
        </ul>
        <Button 
          onClick={() => setActiveTab('submit')} 
          className="flex items-center"
          disabled={policiesWithClaims.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Claim
        </Button>
      </div>
      
      {/* Claims Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Total Claims</p>
              <h3 className="text-2xl font-bold mt-1">
                {isLoading ? '...' : claimStats.total}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <h3 className="text-2xl font-bold mt-1">
                {isLoading ? '...' : claimStats.pending}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Approved</p>
              <h3 className="text-2xl font-bold mt-1">
                {isLoading ? '...' : claimStats.approved}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
              <h3 className="text-2xl font-bold mt-1">
                {isLoading ? '...' : `${parseFloat(formatEther(claimStats.totalAmount)).toFixed(2)} ETH`}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history">Claims History</TabsTrigger>
          {selectedClaimId && <TabsTrigger value="status">Claim Status</TabsTrigger>}
          <TabsTrigger value="submit">Submit Claim</TabsTrigger>
        </TabsList>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Your Claims History</CardTitle>
              <CardDescription>View all submitted insurance claims</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : policiesWithClaims.length > 0 ? (
                <div className="space-y-6">
                  {/* Group claims by policy */}
                  {policiesWithClaims.map(policy => (
                    <div key={policy.policyId} className="space-y-2">
                      <h3 className="text-lg font-medium text-gray-700">
                        Policy #{policy.policyId} - {policy.regPlate}
                      </h3>
                      
                      {/* Use your ClaimsHistory component for each policy */}
                      <ClaimsHistory 
                        policyId={policy.policyId} 
                        onSelectClaim={setSelectedClaimId}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Claims Found</h3>
                  <p className="text-gray-500 mb-4">You have not submitted any insurance claims yet</p>
                  {policiesWithClaims.length > 0 ? (
                    <Button onClick={() => setActiveTab('submit')}>Submit a Claim</Button>
                  ) : (
                    <div className="flex flex-col items-center">
                      <AlertCircle className="h-5 w-5 text-amber-500 mb-2" />
                      <p className="text-amber-600 text-sm">You need an active policy to submit claims</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="status">
          {selectedClaimId && (
            <Card>
              <CardHeader>
                <CardTitle>Claim Status</CardTitle>
                <CardDescription>Track the progress of your claim</CardDescription>
              </CardHeader>
              <CardContent>
                <ClaimStatus claimId={selectedClaimId} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="submit">
          <Card>
            <CardHeader>
              <CardTitle>Submit New Claim</CardTitle>
              <CardDescription>File an insurance claim for your vehicle</CardDescription>
            </CardHeader>
            <CardContent>
              <WalletCheck
                title="Connect Wallet to Submit Claim"
                message="You need to connect your wallet to submit an insurance claim. This verifies your identity and allows you to interact with your policy."
              >
              {policiesWithClaims.length > 0 ? (
                <>
                  {!selectedPolicyId ? (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700">Select a policy to file a claim against:</h3>
                      {policiesWithClaims
                        .filter(policy => policy.isActive)
                        .map(policy => (
                          <Card key={policy.policyId} className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setSelectedPolicyId(policy.policyId)}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">Policy #{policy.policyId}</h4>
                                  <p className="text-sm text-gray-500">Vehicle: {policy.regPlate}</p>
                                </div>
                                <div className="text-sm font-medium">
                                  Coverage: {policy.coverage} ETH
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        className="mb-4 -ml-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => setSelectedPolicyId(null)}
                      >
                        ← Back to policy selection
                      </Button>
                      {/* Use onSuccess callback to update UI after claim submission */}
                      <ClaimSubmission 
                        policyId={selectedPolicyId} 
                        onSuccess={(claimId) => {
                          // Update UI after claim submission
                          handleClaimSubmitted(selectedPolicyId, claimId);
                          // Show notification
                          toast.success('Claim submitted successfully!');
                          // Navigate to claim status view
                          setSelectedClaimId(claimId);
                          setActiveTab('status');
                        }}
                      />
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Policies</h3>
                  <p className="text-gray-500 mb-4">You need an active insurance policy to submit a claim</p>
                  <Button onClick={() => window.location.href = '/dashboard/policies'}>
                    Create Insurance Policy
                  </Button>
                </div>
              )}
              </WalletCheck>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}