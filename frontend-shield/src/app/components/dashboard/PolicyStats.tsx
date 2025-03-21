//src/app/components/dashboard/PolicyStats.tsx -Active policies overview
import React from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface PolicyStatsProps {
  active: number;
  expiringSoon: number;
  totalCoverage: string;
  userAddress: string;
}

const PolicyStats = ({ active, expiringSoon, totalCoverage }: PolicyStatsProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold">{active}</span>
            <span className="text-gray-500">Active Policies</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Total Coverage</p>
            <p className="text-lg">{totalCoverage} ETH</p>
          </div>
        </div>
        
        {expiringSoon > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {expiringSoon} {expiringSoon === 1 ? 'policy' : 'policies'} expiring soon
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PolicyStats;