//src/app/components/dashboard/Stats-Statistics display
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Shield, Car, FileText, TrendingUp } from 'lucide-react';

interface StatsData {
  totalPolicies: number;
  activePolicies: number;
  totalVehicles: number;
  totalClaims: number;
  totalCoverage: string;
}

interface StatsProps {
  data: StatsData;
}

const Stats = ({ data }: StatsProps) => {
  const stats = [
    {
      title: 'Total Policies',
      value: data.totalPolicies,
      subValue: `${data.activePolicies} Active`,
      icon: Shield,
      color: 'text-blue-500',
    },
    {
      title: 'Registered Vehicles',
      value: data.totalVehicles,
      icon: Car,
      color: 'text-green-500',
    },
    {
      title: 'Total Claims',
      value: data.totalClaims,
      icon: FileText,
      color: 'text-purple-500',
    },
    {
      title: 'Total Coverage',
      value: data.totalCoverage,
      subValue: 'ETH',
      icon: TrendingUp,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.subValue && (
                <p className="text-xs text-muted-foreground">
                  {stat.subValue}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default Stats;
