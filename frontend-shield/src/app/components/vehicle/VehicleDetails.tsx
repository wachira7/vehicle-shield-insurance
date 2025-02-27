//../vehicle/VehicleDetails.tsx
import React, { useEffect, useState } from 'react';
import { useVehicle } from '@/app/hooks/useVehicle';
import { formatEther } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle} from '@/app/components/ui/alert';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Car, Calendar, Gauge, ShieldCheck, History, AlertTriangle } from 'lucide-react';

interface VehicleData {
  make: string;
  model: string;
  year: number;
  baseValue: bigint;
  mileage: number;
  condition: number;
  hasAccidentHistory: boolean;
  isRegistered: boolean;
}

interface VehicleDetailsProps {
  regPlate: string;
}
const VehicleDetails = ({ regPlate }: VehicleDetailsProps) => {
  const { getVehicleDetails, isLoading } = useVehicle();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);

  useEffect(() => {
    const fetchVehicle = async () => {
      const vehicleData = await getVehicleDetails(regPlate);
      setVehicle(vehicleData);
    };
    fetchVehicle();
  }, [regPlate, getVehicleDetails]);

  if (isLoading) {
    return (
      <Alert>
        <AlertDescription>Loading vehicle details...</AlertDescription>
      </Alert>
    );
  }

  if (!vehicle) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Vehicle not found</AlertDescription>
      </Alert>
    );
  }

  const getConditionColor = (condition: number) => {
    if (condition >= 8) return 'text-green-500';
    if (condition >= 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{vehicle.make} {vehicle.model}</CardTitle>
            <CardDescription>
              Registration: {regPlate}
            </CardDescription>
          </div>
          {vehicle.hasAccidentHistory && (
            <Alert className="w-auto">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Accident History Reported
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[600px]"> {/* Set a fixed height for the scroll area */}
          <div className="space-y-6 pr-4"> {/* Added right padding for scroll bar */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Car className="h-5 w-5 text-gray-500" />
                    <div>
                      <h3 className="font-medium">Make & Model</h3>
                      <p className="text-sm text-gray-600">
                        {vehicle.make} {vehicle.model}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <div>
                      <h3 className="font-medium">Manufacturing Year</h3>
                      <p className="text-sm text-gray-600">
                        {vehicle.year}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Gauge className="h-5 w-5 text-gray-500" />
                    <div>
                      <h3 className="font-medium">Mileage</h3>
                      <p className="text-sm text-gray-600">
                        {vehicle.mileage.toLocaleString()} km
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <ShieldCheck className={`h-5 w-5 ${getConditionColor(vehicle.condition)}`} />
                    <div>
                      <h3 className="font-medium">Condition</h3>
                      <p className="text-sm text-gray-600">
                        {vehicle.condition}/10
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <History className="h-5 w-5 text-gray-500" />
                    <div>
                      <h3 className="font-medium">Base Value</h3>
                      <p className="text-sm text-gray-600">
                        {formatEther(vehicle.baseValue)} ETH
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Required Actions</h3>
              <div className="space-y-2">
                {!vehicle.isRegistered && (
                  <Alert>
                    <AlertDescription>
                      Vehicle registration needs to be completed
                    </AlertDescription>
                    <Button variant="outline" size="sm" className="mt-2">
                      Complete Registration
                    </Button>
                  </Alert>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button variant="outline">
                Update Details
              </Button>
              <Button variant="outline">
                View Documents
              </Button>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default VehicleDetails;