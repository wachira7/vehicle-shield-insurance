import React, { useState, useEffect } from 'react';
import { usePolicy } from '@/app/hooks/usePolicy';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Slider } from '@/app/components/ui/slider';
import { INSURANCE_CONSTANTS } from '@/app/config/constants';

interface PolicyCreationProps {
    vehicleRegPlate: string;
    onSuccess: () => void;
  }
  
  interface PolicyFormData {
    duration: number;
    coverage: number;
    premium: string;
  }
  
const PolicyCreation = ({ vehicleRegPlate }: PolicyCreationProps) => {
  const { createPolicy, calculatePremium, isLoading } = usePolicy();
  const [formData, setFormData] = useState<PolicyFormData>({
    duration: 180, // 6 months default
    coverage: parseFloat(INSURANCE_CONSTANTS.MIN_COVERAGE),
    premium: '0',
  });
  const [error, setError] = useState('');


  // Calculate premium whenever coverage changes
  useEffect(() => {
    const getPremium = async () => {
      try {
        // Assuming tier 1 for now - could be made dynamic
        const premium = await calculatePremium(vehicleRegPlate, 1);
        setFormData(prev => ({ ...prev, premium }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to calculate premium';
        setError(errorMessage);
      }
    };
    getPremium();
  }, [formData.coverage, vehicleRegPlate, calculatePremium]);

  const handleSubmit = async () => {
    try {
      setError('');
      const result = await createPolicy(
        vehicleRegPlate,
        formData.duration,
        formData.coverage.toString(),
        formData.premium
      );

      if (result.error) {
        throw result.error;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create policy';  
      setError(errorMessage);
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Create New Policy</CardTitle>
        <CardDescription>
          Set up insurance coverage for your vehicle {vehicleRegPlate}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Coverage Duration (days)</Label>
          <div className="flex items-center space-x-4">
            <Slider
              value={[formData.duration]}
              onValueChange={([value]) => 
                setFormData(prev => ({ ...prev, duration: value }))
              }
              min={INSURANCE_CONSTANTS.MIN_DURATION}
              max={INSURANCE_CONSTANTS.MAX_DURATION}
              step={30}
              className="flex-1"
            />
            <span className="w-16 text-right">{formData.duration}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Coverage Amount (ETH)</Label>
          <Input
            type="number"
            value={formData.coverage}
            onChange={(e) => 
              setFormData(prev => ({ 
                ...prev, 
                coverage: parseFloat(e.target.value) 
              }))
            }
            min={INSURANCE_CONSTANTS.MIN_COVERAGE}
            max={INSURANCE_CONSTANTS.MAX_COVERAGE}
            step="0.1"
          />
          <p className="text-sm text-gray-500">
            Min: {INSURANCE_CONSTANTS.MIN_COVERAGE} ETH, 
            Max: {INSURANCE_CONSTANTS.MAX_COVERAGE} ETH
          </p>
        </div>

        <div className="space-y-2">
          <Label>Premium (ETH)</Label>
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-lg font-semibold">{formData.premium} ETH</p>
            <p className="text-sm text-gray-500">
              Based on vehicle details and coverage selected
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Policy...' : 'Create Policy'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PolicyCreation;