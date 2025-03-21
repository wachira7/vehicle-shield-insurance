//src/app/components/dashboard/Overview.tsx -General dashboard overview
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Activity, Plus, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  userAddress: string;
}

const DashboardOverview = ({ userAddress }: DashboardProps) => {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <Activity className="mr-2 h-5 w-5 text-blue-500" />
              Insurance Status for {userAddress}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">3 Active</p>
              <p className="text-sm text-gray-500">Policies</p>
            </div>
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                1 policy expires in 30 days
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Recent Claims</CardTitle>
            <CardDescription>Last 30 days activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[150px]">
              <div className="space-y-4">
                {/* We'll replace this with ClaimsList component */}
                <p className="text-sm text-gray-500">No recent claims</p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                New Policy
              </Button>
              <Button className="w-full" variant="outline">
                Submit Claim
              </Button>
              <Button className="w-full" variant="outline">
                Register Vehicle
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Policy & Vehicle Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* We'll add PolicyList component here */}
          {/* We'll add VehicleList component here */}
        </div>

        {/* Right Column - Activity Feed */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {/* We'll replace this with ActivityFeed component */}
                <p className="text-sm text-gray-500">No recent activity</p>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview