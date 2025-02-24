// Recent activities/transactions
import React from 'react';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Shield, FileText, Car, Clock } from 'lucide-react';

interface Activity {
  id: string;
  type: 'policy' | 'claim' | 'vehicle';
  action: string;
  timestamp: Date;
  details: string;
  policyId?: number; 
}

const ActivityFeed = ({ activities }: { activities: Activity[] }) => {
  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'policy': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'claim': return <FileText className="h-4 w-4 text-purple-500" />;
      case 'vehicle': return <Car className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4 p-2">
            {getIcon(activity.type)}
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{activity.action}</p>
              <p className="text-xs text-gray-500">{activity.details}</p>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              {activity.timestamp.toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ActivityFeed;