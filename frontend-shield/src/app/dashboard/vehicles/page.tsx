//src/app/dashboard/vehicles/page.tsx
'use client';

import { useState, useEffect } from 'react';
import VehicleRegistration from '@/app/components/vehicle/Registration';
import VehicleDetails from '@/app/components/vehicle/VehicleDetails';
import PhotoUpload from '@/app/components/vehicle/PhotoUpload';
import { WalletCheck } from '@/app/components/Wallet/WalletCheck';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Button } from '@/app/components/ui/button';
import { useAccount } from 'wagmi';
import { useVehicle } from '@/app/hooks/useVehicle';
import { Car, Plus, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PHOTO_REQUIREMENTS } from '@/app/config/constants';

// Define interface for a vehicle
interface Vehicle {
  regPlate: string;
  make: string;
  model: string;
  year: number;
  baseValue: bigint;
  mileage: number;
  condition: number;
  hasAccidentHistory: boolean;
  isRegistered: boolean;
}

export default function VehiclesPage() {
  const { address } = useAccount();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [fetchingVehicles, setFetchingVehicles] = useState(false);
  
  // Get the methods from your hook
  const { uploadPhotos,  isLoading } = useVehicle();

  // This would need to be implemented to fetch user's vehicles from your API/blockchain
  const fetchUserVehicles = async () => {
    setFetchingVehicles(true);
    try {
      // In a real implementation, you would call your smart contract to get vehicles
      // For testing purposes, we'll use mock data
      
      // First approach: If your smart contract has a function to get all user vehicles
      // const { data, error } = await readFromContract('InsuranceCore', 'getUserVehicles', [address]);
      
      // For demo purposes, using mock data
      const mockVehicles: Vehicle[] = [
        {
          regPlate: 'ABC123',
          make: 'Toyota',
          model: 'Camry',
          year: 2021,
          baseValue: BigInt(20000),
          mileage: 15000,
          condition: 9,
          hasAccidentHistory: false,
          isRegistered: true
        },
        {
          regPlate: 'XYZ789',
          make: 'Honda',
          model: 'Civic',
          year: 2020,
          baseValue: BigInt(18000),
          mileage: 22000,
          condition: 8,
          hasAccidentHistory: false,
          isRegistered: true
        }
      ];
      
      setUserVehicles(mockVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load your vehicles');
    } finally {
      setFetchingVehicles(false);
    }
  };

  // Fetch vehicles when component mounts or address changes
  useEffect(() => {
    if (address) {
      fetchUserVehicles();
    }
  }, [address]);

  // Handle photo upload
  const handlePhotoUpload = async (photos: Record<string, File>) => {
    if (!selectedVehicle) return;
    
    try {
      // This uses the actual blockchain call
      const result = await uploadPhotos({
        regPlate: selectedVehicle,
        photos: photos as Record<typeof PHOTO_REQUIREMENTS.requiredViews[number], File>
      });
      
      if (result.hash) {
        setShowPhotoUpload(false);
        toast.success(`Photos uploaded successfully! TX: ${result.hash.substring(0, 10)}...`);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    }
  };

  // Handle vehicle registration success
  const handleRegistrationSuccess = (regPlate: string) => {
    setSelectedVehicle(regPlate);
    setActiveTab('photos');
    // Refresh the list of vehicles
    fetchUserVehicles();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Vehicle Management</h1>
        <Button 
          onClick={() => { 
            setSelectedVehicle(null);
            setActiveTab('register');
          }} 
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">My Vehicles</TabsTrigger>
          {selectedVehicle && <TabsTrigger value="details">Vehicle Details</TabsTrigger>}
          {selectedVehicle && <TabsTrigger value="photos">Vehicle Photos</TabsTrigger>}
          <TabsTrigger value="register">Register New</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {fetchingVehicles || isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : userVehicles && userVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userVehicles.map((vehicle) => (
                <Card key={vehicle.regPlate} className="cursor-pointer hover:bg-gray-50 transition-colors" 
                  onClick={() => {
                    setSelectedVehicle(vehicle.regPlate);
                    setActiveTab('details');
                  }}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 rounded-full p-3">
                        <Car className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{vehicle.make} {vehicle.model}</h3>
                        <p className="text-sm text-gray-500">Registration: {vehicle.regPlate}</p>
                        <p className="text-sm text-gray-500">Year: {vehicle.year}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Car className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Vehicles Found</h3>
                <p className="text-gray-500 mb-4">Add your first vehicle to get started with insurance</p>
                <Button onClick={() => setActiveTab('register')}>Register Vehicle</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="details">
          {selectedVehicle && (
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Details</CardTitle>
                <CardDescription>View and manage your vehicle information</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedVehicle ? (
                  // Using the VehicleDetails component to display vehicle information
                  <VehicleDetails regPlate={selectedVehicle} />
                ) : (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                )}
                
                <div className="mt-6 flex space-x-4">
                  <Button 
                    variant="outline" 
                    className="flex items-center"
                    onClick={() => setActiveTab('photos')}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Manage Photos
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Navigate to policy creation with this vehicle pre-selected
                      window.location.href = `/dashboard/policies?vehicle=${selectedVehicle}`;
                    }}
                  >
                    Create Insurance Policy
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="photos">
          {selectedVehicle && (
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Photos</CardTitle>
                <CardDescription>Upload and manage photos of your vehicle</CardDescription>
              </CardHeader>
              <CardContent>
               <WalletCheck
                  title="Connect Wallet to Manage Photos"
                  message="You need to connect your wallet to upload and manage vehicle photos. This ensures your photos are securely stored and linked to your vehicle."
                >
                {showPhotoUpload ? (
                  <div className="space-y-4">
                    <PhotoUpload 
                      regPlate={selectedVehicle}
                      onSuccess={handlePhotoUpload}
                      onCancel={() => setShowPhotoUpload(false)}
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Placeholder for vehicle photos - replace with actual photos */}
                      {PHOTO_REQUIREMENTS.requiredViews.map((view) => (
                        <div key={view} className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border">
                          <p className="text-gray-500">{view} View</p>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={() => setShowPhotoUpload(true)}
                      className="flex items-center"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Upload New Photos
                    </Button>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-medium text-blue-800 mb-1">Why upload photos?</h4>
                      <p className="text-sm text-blue-700">
                        High-quality photos of your vehicle help with faster claims processing 
                        and can be used to document the condition of your vehicle before insurance 
                        coverage begins.
                      </p>
                    </div>
                  </div>
                )}
                </WalletCheck>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle>Register New Vehicle</CardTitle>
              <CardDescription>
                Add a new vehicle to your account to create insurance policies
              </CardDescription>
            </CardHeader>
            <CardContent>
             <WalletCheck 
                title="Connect Wallet to Register Vehicle"
                message="You need to connect your wallet to register a vehicle. This allows us to create a secure blockchain record of your vehicle."
              >
              {/* Passing registerVehicle to make sure it's used */}
              <VehicleRegistration 
                onSuccess={handleRegistrationSuccess} 
              
              />
              </WalletCheck>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}