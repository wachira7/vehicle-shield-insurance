//actioncard
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';

interface Action {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
}

interface ActionCardProps {
  title: string;
  actions: Action[];
}

const ActionCard = ({ title, actions }: ActionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="w-full justify-start"
                onClick={action.onClick}
              >
                <Icon className="h-4 w-4 mr-2" />
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium">{action.title}</span>
                  <span className="text-xs text-gray-500">{action.description}</span>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionCard;