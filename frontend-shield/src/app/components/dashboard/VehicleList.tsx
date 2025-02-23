// User's vehicles summary
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Car, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Vehicle {
  regPlate: string;
  make: string;
  model: string;
  isInsured: boolean;
}

const VehicleList = ({ vehicles }: { vehicles: Vehicle[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Vehicles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.regPlate}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <Car className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                  <p className="text-sm text-gray-500">{vehicle.regPlate}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {vehicle.isInsured ? (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleList;