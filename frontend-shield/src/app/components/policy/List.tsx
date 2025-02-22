import React, { useEffect, useState } from 'react';
import { usePolicy } from '@/app/hooks/usePolicy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Shield, Clock, AlertTriangle, type LucideIcon } from 'lucide-react';

interface PolicyData {
  policyId: number;
  regPlate: string;
  coverage: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  owner: string;
  premium: bigint;
}

interface PolicyListProps {
  userAddress: string;
}

interface PolicyStatus {
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED';
  icon: LucideIcon;
  color: string;
}
const PolicyList = ({ userAddress }: PolicyListProps) => {
  const { getUserPolicies, getPolicyDetails, isLoading } = usePolicy();
  const [policies, setPolicies] = useState<PolicyData[]>([]);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        // Get all policy IDs for the user
        const policyIds = await getUserPolicies(userAddress);
        
        // Fetch details for each policy
        const policyDetails = await Promise.all(
          policyIds.map(id => getPolicyDetails(id))
        );
        
        setPolicies(policyDetails.filter((policy): policy is PolicyData => Boolean(policy)));
      } catch (error) {
        console.error('Error fetching policies:', error);
      }
    };

    fetchPolicies();
  }, [userAddress, getUserPolicies, getPolicyDetails]);

  const getPolicyStatus = (policy: PolicyData): PolicyStatus => {
    const now = Date.now();
    if (now < policy.startDate.getTime()) {
      return { status: 'PENDING', icon: Clock, color: 'text-yellow-500' };
    }
    if (now > policy.endDate.getTime()) {
      return { status: 'EXPIRED', icon: AlertTriangle, color: 'text-red-500' };
    }
    return { status: 'ACTIVE', icon: Shield, color: 'text-green-500' };
  };

  if (isLoading) {
    return (
      <Alert>
        <AlertDescription>Loading policies...</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Insurance Policies</CardTitle>
        <CardDescription>
          View and manage your vehicle insurance policies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {policies.map((policy) => {
              const { status, icon: StatusIcon, color } = getPolicyStatus(policy);
              const Icon = StatusIcon;

              return (
                <Card key={policy.policyId} className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Icon className={`h-5 w-5 ${color}`} />
                          <h3 className="font-medium">
                            Policy #{policy.policyId}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600">
                          Vehicle: {policy.regPlate}
                        </p>
                        <p className="text-sm text-gray-600">
                          Coverage: {policy.coverage} ETH
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <span className={`inline-block px-2 py-1 text-sm rounded-full ${
                          status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {status}
                        </span>
                        <p className="text-xs text-gray-500">
                          Valid until: {policy.endDate.toLocaleDateString()}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {/* Add navigation to policy details */}}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {policies.length === 0 && (
              <Alert>
                <AlertDescription>
                  You do not have any active policies. Create one to get started!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PolicyList;