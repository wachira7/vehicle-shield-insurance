import React, { useEffect, useState } from 'react';
import { useClaim } from '@/app/hooks/useClaim';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/app/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { formatEther } from 'viem';
import { format } from 'date-fns';


interface ClaimData {
    policyId: number;
    description: string;
    photoHash: string;
    amount: bigint;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING';
    timestamp: bigint;
  }
  
  interface ClaimHistoryProps {
    policyId: number;
  }
const ClaimsHistory = ({ policyId }: ClaimHistoryProps) => {
  const { getClaimHistory, isLoading } = useClaim();
  const [claims, setClaims] = useState<ClaimData[]>([]);

  useEffect(() => {
    const fetchClaims = async () => {
      const claimHistory = await getClaimHistory(policyId);
      setClaims(claimHistory);
    };
    fetchClaims();
  }, [policyId, getClaimHistory]);

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: string } = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
      PROCESSING: "bg-blue-100 text-blue-800"
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return <div>Loading claims history...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Claims History</CardTitle>
        <CardDescription>View all claims for Policy #{policyId}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount (ETH)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((claim) => (
              <TableRow key={claim.timestamp.toString()}>
                <TableCell>
                  {format(new Date(Number(claim.timestamp) * 1000), 'PPP')}
                </TableCell>
                <TableCell>{claim.description}</TableCell>
                <TableCell>{formatEther(claim.amount)}</TableCell>
                <TableCell>
                  <Badge className={getStatusBadge(claim.status)}>
                    {claim.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {claims.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500">
                  No claims found for this policy
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ClaimsHistory;