import React, { useState } from 'react';
import { useClaim } from '@/app/hooks/useClaim';
import {  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import {  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from '@/app/components/ui/alert-dialog';
import { Camera, Upload } from 'lucide-react';

const ClaimSubmission = ({ policyId }: {policyId : number}) => {
  const { submitClaim, isLoading } = useClaim();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [photoHash, setPhotoHash] = useState('');

  const handlePhotoUpload = (event : React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if (file) {
      // Simulate photo hash generation
      setPhotoHash(`photo_${Date.now()}`);
      setPhoto(file);
    }
  };

  const handleSubmit = async () => {
    const result = await submitClaim(
      policyId,
      description,
      photoHash,
      parseFloat(amount)
    );
    
    if (!result.error) {
      setDescription('');
      setAmount('');
      setPhoto(null);
      setPhotoHash('');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Submit Insurance Claim</CardTitle>
        <CardDescription>
          Please provide details about your insurance claim
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="description">Claim Description</Label>
          <Textarea
            id="description"
            placeholder="Describe what happened..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-32"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Claim Amount (ETH)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="photo">Evidence Photo</Label>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => document.getElementById('photo-upload')?.click()}
            >
              {photo ? (
                <span className="flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Photo Selected
                </span>
              ) : (
                <span className="flex items-center">
                  <Camera className="w-4 h-4 mr-2" />
                  Upload Photo
                </span>
              )}
            </Button>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full"
          onClick={() => setShowConfirm(true)}
          disabled={!description || !amount || !photoHash || isLoading}
        >
          {isLoading ? 'Submitting...' : 'Submit Claim'}
        </Button>
      </CardFooter>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Claim Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this claim? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Submit Claim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ClaimSubmission;