//useVehicle.ts
"use client"
import { useState } from 'react';
import { useContract } from './useContract';
import { INSURANCE_CONSTANTS, PHOTO_REQUIREMENTS } from '../config/constants';
import { toast } from 'react-hot-toast';

// Define types for photos
type PhotoType = 'image/jpeg' | 'image/png';
type PhotoView = typeof PHOTO_REQUIREMENTS.requiredViews[number];

// Explicit interfaces for better documentation and type safety

interface VehicleData {
    make: string;
    model: string;
    year: number;
    baseValue: bigint;
    mileage: number;
    condition: number;
    hasAccidentHistory: boolean;
    isRegistered: boolean;
    // Add other fields from your smart contract
}
interface PhotoValidation {
    regPlate: string;
    photos: Record<PhotoView, File>;
    maxSize: number;
    acceptedTypes: readonly PhotoType[];
    requiredViews: readonly PhotoView[];
}

interface VehicleRegistration {
    regPlate: string;
    make: string;
    model: string;
    year: number;
    baseValue: number;
    mileage: number;
    condition: number;
    hasAccidentHistory: boolean;
}

export const useVehicle = () => {
    const { readFromContract, writeToContract } = useContract();
    const [isLoading, setIsLoading] = useState(false);

    const validatePhotos = ({ photos, maxSize, acceptedTypes, requiredViews }: Omit<PhotoValidation, 'regPlate'>) => {
        requiredViews.forEach(view => {
            const photo = photos[view];
            if (!photo) {
                throw new Error(`Missing required photo: ${view}`);
            }
            if (photo.size > maxSize) {
                throw new Error(`${view} photo exceeds size limit`);
            }
            if (!acceptedTypes.includes(photo.type as PhotoType)) {
                throw new Error(`Invalid file type for ${view} photo`);
            }
        });
    };

    const registerVehicle = async ({
        regPlate,
        make,
        model,
        year,
        baseValue,
        mileage,
        condition,
        hasAccidentHistory
    }: VehicleRegistration) => {
        try {
            setIsLoading(true);
            // Validate inputs
            if (mileage > INSURANCE_CONSTANTS.MAX_MILEAGE) {
                throw new Error('Mileage exceeds maximum allowed');
            }
            if (condition > INSURANCE_CONSTANTS.CONDITION_SCALE) {
                throw new Error('Condition must be between 1-10');
            }

            const { hash, error } = await writeToContract('InsuranceCore', 'registerVehicle', [
                regPlate,
                make,
                model,
                year,
                baseValue,
                mileage,
                condition,
                hasAccidentHistory,
            ]);

            if (error) throw error;
            if (hash) toast.success('Vehicle registered successfully');
            
            return { hash, error: null };

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to register vehicle';
            console.error('Error registering vehicle:', error);
            toast.error(message);
            return { hash: null, error };
        } finally {
            setIsLoading(false);
        }
    };

    const uploadPhotos = async ({ regPlate, photos }: Pick<PhotoValidation, 'regPlate' | 'photos'>) => {
        try {
            setIsLoading(true);
            
            // Validate photos using the validation function
            validatePhotos({
                photos,
                maxSize: PHOTO_REQUIREMENTS.maxSize,
                acceptedTypes: PHOTO_REQUIREMENTS.acceptedTypes,
                requiredViews: PHOTO_REQUIREMENTS.requiredViews
            });

            const photoHashes = {
                front: 'hash1',
                back: 'hash2',
                left: 'hash3',
                right: 'hash4',
                mirrorLeft: 'hash5',
                mirrorRight: 'hash6'
            } as const;

            const { hash, error } = await writeToContract('InsuranceCore', 'uploadVehiclePhotos', [
                regPlate,
                photoHashes.front,
                photoHashes.back,
                photoHashes.left,
                photoHashes.right,
                photoHashes.mirrorLeft,
                photoHashes.mirrorRight,
            ]);

            if (error) throw error;
            if (hash) toast.success('Photos uploaded successfully');
            
            return { hash, error: null };

        }  catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload photos';
            console.error('Error uploading photos:', error);
            toast.error(message);
            return { hash: null, error };
        } finally {
            setIsLoading(false);
        }
    };

    const getVehicleDetails = async (regPlate: string) => {
        try {
            const { data, error } = await readFromContract<VehicleData>('InsuranceCore', 'vehicles', [regPlate]);
            if (error) throw error;
            return data;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch vehicle details';
            console.error('Error fetching vehicle details:', error);
            toast.error(message);
            return null;
        }
    };

    return {
        registerVehicle,
        uploadPhotos,
        getVehicleDetails,
        isLoading,
    };
};