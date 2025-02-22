import React, { useEffect, useState } from 'react';
import { useClaim } from '@/app/hooks/useClaim';
import { Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/app/components/ui/card';
import { Alert, AlertDescription, AlertTitle} from '@/app/components/ui/alert';
import { formatEther } from 'viem';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ClaimData {
    policyId: number;
    description: string;
    photoHash: string;
    amount: bigint;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING';
    timestamp: bigint;
  }
  
  interface ClaimStatusProps {
    claimId: number;
  }
const ClaimStatus = ({ claimId }: ClaimStatusProps) => {
  const { getClaimDetails, isLoading } = useClaim();
  const [claim, setClaim] = useState<ClaimData | null>(null);

  useEffect(() => {
    const fetchClaim = async () => {
      const claimData = await getClaimDetails(claimId);
      setClaim(claimData);
    };
    fetchClaim();
  }, [claimId, getClaimDetails]);

  const getStatusIcon = (status: ClaimData['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case 'APPROVED':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-blue-500" />;
    }
  };

  const getStatusMessage = (status: ClaimData['status']) => {
    const messages = {
      PENDING: "Your claim is under review. We'll notify you of any updates.",
      APPROVED: "Your claim has been approved! Payment will be processed soon.",
      REJECTED: "Your claim was not approved. Please contact support for more information.",
      PROCESSING: "Your claim is being processed by our team."
    };
    return messages[status] || "Status unknown";
  };

  if (isLoading) {
    return (
      <Alert>
        <AlertDescription>Loading claim status...</AlertDescription>
      </Alert>
    );
  }

  if (!claim) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Claim not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon(claim.status)}
          Claim Status
        </CardTitle>
        <CardDescription>
          Claim #{claimId} - {formatEther(claim.amount)} ETH
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="font-medium mb-2">Description</h3>
          <p className="text-sm text-gray-600">{claim.description}</p>
        </div>

        <Alert>
          <AlertTitle className="font-medium">Current Status: {claim.status}</AlertTitle>
          <AlertDescription>
            {getStatusMessage(claim.status)}
          </AlertDescription>
        </Alert>

        <div className="text-sm text-gray-500">
          Submitted on: {new Date(Number(claim.timestamp) * 1000).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClaimStatus;