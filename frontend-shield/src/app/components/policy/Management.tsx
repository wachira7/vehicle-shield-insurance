import React, { useEffect, useState } from 'react';
import { usePolicy } from '@/app/hooks/usePolicy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Calendar, FileText, Shield, AlertCircle, ChevronRight } from 'lucide-react';

interface PolicyData {
  regPlate: string;
  coverage: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  owner: string;      
  policyId: number;   
  premium: bigint;
}

interface PolicyManagementProps {
  policyId: number;
}

type TabId = 'overview' | 'claims' | 'documents';

const PolicyManagement = ({ policyId }: PolicyManagementProps) => {
  const { getPolicyDetails, isLoading } = usePolicy();
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    const fetchPolicy = async () => {
      const policyData = await getPolicyDetails(policyId);
      if (policyData) {
        // Add the missing properties to policyData
        const completePolicyData: PolicyData = {
          ...policyData,
          owner: '', // You need to get the owner from somewhere
          policyId: policyId, // You already have the policyId
          premium: BigInt(0), // You need to get the premium from somewhere
        };
        setPolicy(completePolicyData);
      } else{
      setPolicy(null);
      }
    };
    fetchPolicy();
  }, [policyId, getPolicyDetails]);

  if (isLoading) {
    return (
      <Alert>
        <AlertDescription>Loading policy details...</AlertDescription>
      </Alert>
    );
  }

  if (!policy) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Policy not found</AlertDescription>
      </Alert>
    );
  }

  const isActive = () => {
    const now = Date.now();
    return now >= policy.startDate.getTime() && now <= policy.endDate.getTime();
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="font-medium">Coverage Amount</h3>
            <p className="text-2xl font-bold">{policy.coverage} ETH</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-blue-500" />
          <div>
            <h3 className="font-medium">Policy Period</h3>
            <p className="text-sm text-gray-600">
              {policy.startDate.toLocaleDateString()} - {policy.endDate.toLocaleDateString()}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-purple-500" />
          <div>
            <h3 className="font-medium">Vehicle Details</h3>
            <p className="text-sm text-gray-600">
              Registration: {policy.regPlate}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>

      {!isActive() && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Policy Status</AlertTitle>
          <AlertDescription>
            This policy is {Date.now() > policy.endDate.getTime() ? 'expired' : 'not yet active'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderClaims = () => (
    <ScrollArea className="h-96">
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            View and manage claims for this policy
          </AlertDescription>
        </Alert>
        {/* Claims list component would be imported and rendered here */}
      </div>
    </ScrollArea>
  );

  const renderDocuments = () => (
    <ScrollArea className="h-96">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <h3 className="font-medium">Policy Document</h3>
                    <p className="text-sm text-gray-600">Insurance Terms & Conditions</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Download</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <h3 className="font-medium">Coverage Certificate</h3>
                    <p className="text-sm text-gray-600">Proof of Insurance</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Download</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'claims', label: 'Claims', icon: FileText },
    { id: 'documents', label: 'Documents', icon: Calendar }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'claims':
        return renderClaims();
      case 'documents':
        return renderDocuments();
      default:
        return renderOverview();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Policy Management</CardTitle>
        <CardDescription>
          Manage your insurance policy #{policyId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-4 mb-6">
          {menuItems.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? "default" : "outline"}
              className="flex-1"
              onClick={() => setActiveTab(id as TabId)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default PolicyManagement;