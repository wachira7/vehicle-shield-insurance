import React, { useState } from 'react';
import { useVehicle } from '@/app/hooks/useVehicle';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Camera,  Upload, X, Check } from 'lucide-react';
import { PHOTO_REQUIREMENTS } from '@/app/config/constants';

type PhotoView = typeof PHOTO_REQUIREMENTS.requiredViews[number]; 
type PhotoType = typeof PHOTO_REQUIREMENTS.acceptedTypes[number]; // "image/jpeg" | "image/png"

interface PhotoUploadProps {
  regPlate: string;
  onSuccess?: (photos: Record<string, File>) => Promise<void>
  onCancel?: () => void
}

interface Photo extends File {
  size: number;
  type: string;
  name: string;
}

const PhotoUpload = ({ regPlate }: PhotoUploadProps) => {
  const { uploadPhotos, isLoading } = useVehicle();
  const [photos, setPhotos] = useState<{ [key: string]: Photo | null }>({
    front: null,
    back: null,
    left: null,
    right: null,
    mirrorLeft: null,
    mirrorRight: null,
  });
  const [error, setError] = useState<string>('');


  const isValidPhotoType = (type: string): type is PhotoType => {
    return PHOTO_REQUIREMENTS.acceptedTypes.includes(type as typeof PHOTO_REQUIREMENTS.acceptedTypes[number]);
  };

  const handlePhotoSelect = (view: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && isValidPhotoType(file.type)) {
      setPhotos(prev => ({
        ...prev,
        [view]: file as Photo
      }));
      setError('');
    } else if (file) {
      setError('Invalid file type. Please upload a JPEG or PNG file.');
    }
  };

  const removePhoto = (view: string) => {
    setPhotos(prev => ({
      ...prev,
      [view]: null
    }));
  };

  const handleUpload = async () => {
    try {
      setError('');
      
      // Check if all required photos are present
      const missingPhotos = PHOTO_REQUIREMENTS.requiredViews.filter(
        view => !isPhotoComplete(view)
      );

      if (missingPhotos.length > 0) {
        throw new Error(`Missing required photos: ${missingPhotos.join(', ')}`);
      }

      // Create the required photo record
      const photoRecord = PHOTO_REQUIREMENTS.requiredViews.reduce((acc, view) => {
        acc[view] = photos[view] as File;
        return acc;
      }, {} as Record<PhotoView, File>);

      const result = await uploadPhotos({
        regPlate,
        photos: photoRecord
      });
      
      if (result.error) throw result.error;
      
      // Clear photos on success
      setPhotos({
        front: null,
        back: null,
        left: null,
        right: null,
        mirrorLeft: null,
        mirrorRight: null,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload photos';
      setError(errorMessage);
    }
  };
  
  const isPhotoComplete = (view: string): boolean => {
    const photo = photos[view];
    return Boolean(
      photo &&
      photo.size <= PHOTO_REQUIREMENTS.maxSize &&
      isValidPhotoType(photo.type)
    );
  };

  const allPhotosComplete = (): boolean => {
    return PHOTO_REQUIREMENTS.requiredViews.every(view => isPhotoComplete(view));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Vehicle Photos</CardTitle>
        <CardDescription>
          Upload clear photos of your vehicle from all required angles
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-2 gap-4">
            {PHOTO_REQUIREMENTS.requiredViews.map((view) => (
              <Card key={view} className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium capitalize">{view} View</h3>
                      {photos[view] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePhoto(view)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {photos[view] ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 truncate">
                          {photos[view]?.name}
                        </span>
                        {isPhotoComplete(view) ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTitle>Invalid file</AlertTitle>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById(`photo-${view}`)?.click()}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Select Photo
                      </Button>
                    )}

                    <input
                      type="file"
                      id={`photo-${view}`}
                      className="hidden"
                      accept={PHOTO_REQUIREMENTS.acceptedTypes.join(',')}
                      onChange={handlePhotoSelect(view)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-4 text-sm text-gray-500">
          <p>Requirements:</p>
          <ul className="list-disc list-inside">
            <li>Maximum file size: {PHOTO_REQUIREMENTS.maxSize / (1024 * 1024)}MB</li>
            <li>Accepted formats: {PHOTO_REQUIREMENTS.acceptedTypes.join(', ')}</li>
            <li>All views must be clear and well-lit</li>
          </ul>
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleUpload}
          disabled={!allPhotosComplete() || isLoading}
        >
          {isLoading ? (
            <div className="flex items-center">
              <Upload className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </div>
          ) : (
            <div className="flex items-center">
              <Upload className="h-4 w-4 mr-2" />
              Upload Photos
            </div>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PhotoUpload;