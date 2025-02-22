import React, { useState } from 'react';
import { useVehicle } from '@/app/hooks/useVehicle';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { INSURANCE_CONSTANTS } from '@/app/config/constants';

const VehicleRegistration = () => {
  const { registerVehicle, isLoading } = useVehicle();
  const [formData, setFormData] = useState({
    regPlate: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    baseValue: '',
    mileage: '',
    condition:  '' as string , 
    hasAccidentHistory: false
  });
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> ) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.regPlate.trim()) {
      throw new Error('Registration plate is required');
    }
    if (!formData.make.trim() || !formData.model.trim()) {
      throw new Error('Vehicle make and model are required');
    }
    if (formData.year < 1900 || formData.year > new Date().getFullYear()) {
      throw new Error('Invalid year');
    }
    const mileage = parseInt(formData.mileage);
    if (isNaN(mileage) || mileage > INSURANCE_CONSTANTS.MAX_MILEAGE) {
    throw new Error(`Mileage cannot exceed ${INSURANCE_CONSTANTS.MAX_MILEAGE}`);
    }
    if (parseInt(formData.condition) < 1 || parseInt(formData.condition) > 10) {
      throw new Error('Condition must be between 1 and 10');
    }
    if (!formData.baseValue || parseFloat(formData.baseValue) <= 0) {
      throw new Error('Base value must be greater than 0');
    }
  };

  const handleSubmit = async () => {
    try {
      setError('');
      validateForm();

      const result = await registerVehicle({
        ...formData,
        baseValue: parseFloat(formData.baseValue),
        mileage: parseInt(formData.mileage),
        condition: parseInt(formData.condition)
      });

      if (result.error) throw result.error;
      
      // Clear form or redirect based on success
      
    } catch (error) {
      setError((error as Error).message || 'Failed to register vehicle');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Register New Vehicle</CardTitle>
        <CardDescription>
          Enter your vehicle details for insurance registration
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="regPlate">Registration Plate</Label>
            <Input
              id="regPlate"
              name="regPlate"
              value={formData.regPlate}
              onChange={handleInputChange}
              placeholder="ABC123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              name="year"
              type="number"
              value={formData.year}
              onChange={handleInputChange}
              max={new Date().getFullYear()}
              min="1900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="make">Make</Label>
            <Input
              id="make"
              name="make"
              value={formData.make}
              onChange={handleInputChange}
              placeholder="Toyota"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              placeholder="Camry"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseValue">Base Value (ETH)</Label>
            <Input
              id="baseValue"
              name="baseValue"
              type="number"
              step="0.01"
              value={formData.baseValue}
              onChange={handleInputChange}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mileage">Mileage</Label>
            <Input
              id="mileage"
              name="mileage"
              type="number"
              value={formData.mileage}
              onChange={handleInputChange}
              max={INSURANCE_CONSTANTS.MAX_MILEAGE}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition (1-10)</Label>
            <Input
              id="condition"
              name="condition"
              type="number"
              min="1"
              max="10"
              value={formData.condition}
              onChange={handleInputChange}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasAccidentHistory"
              name="hasAccidentHistory"
              checked={formData.hasAccidentHistory}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="hasAccidentHistory">Accident History</Label>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Registering...' : 'Register Vehicle'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VehicleRegistration;