import React, { useState } from 'react';
import { useClaim } from '@/app/hooks/useClaim';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Button } from '@/app/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/app/components/ui/alert-dialog';
import { Camera, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ClaimSubmissionProps {
  policyId: number;
  onSuccess?: (claimId: number) => void;
}

const ClaimSubmission = ({ policyId, onSuccess }: ClaimSubmissionProps) => {
  const { submitClaim, isLoading } = useClaim();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [photoHash, setPhotoHash] = useState('');

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      // Reset form fields
      setDescription('');
      setAmount('');
      setPhoto(null);
      setPhotoHash('');
      
      // For demonstration, simulate getting a claim ID
      // In a real app, you'd extract this from the transaction result
      // This is a placeholder - replace with actual contract event parsing
      if (result.hash) {
        try {
          // Simulate getting the claim ID
          // In reality, you would get this from transaction receipt events
          // or from your backend/indexer service
          const simulatedClaimId = Math.floor(Date.now() / 1000); // Using timestamp as mock ID
          
          // Call the success callback if provided
          if (onSuccess) {
            onSuccess(simulatedClaimId);
            toast.success(`Claim #${simulatedClaimId} submitted successfully!`);
          }
        } catch (error) {
          console.error("Error processing claim submission:", error);
          toast.success("Claim submitted, but couldn't retrieve claim ID");
        }
      }
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