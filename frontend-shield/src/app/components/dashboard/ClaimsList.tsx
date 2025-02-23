//Recent claims
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { formatEther } from 'viem';

interface ClaimItem {
  id: number;
  policyId: number;
  amount: bigint;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: Date;
}

interface ClaimsListProps {
  claims: ClaimItem[];
  onViewClaim: (id: number) => void;
}

const ClaimsList = ({ claims, onViewClaim }: ClaimsListProps) => {
  const getStatusColor = (status: ClaimItem['status']) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Claims</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{formatEther(claim.amount)} ETH</p>
                <p className="text-sm text-gray-500">
                  Policy #{claim.policyId} • {claim.date.toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(claim.status)}>
                  {claim.status}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewClaim(claim.id)}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
          {claims.length === 0 && (
            <p className="text-sm text-gray-500 text-center">No recent claims</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClaimsList;