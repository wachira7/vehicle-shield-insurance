//src/app/hooks/useVehicle.ts
"use client"
import { useState, useCallback, useRef } from 'react';
import { useContract } from './useContract';
import { INSURANCE_CONSTANTS, PHOTO_REQUIREMENTS } from '../config/constants';
import { toast } from 'react-hot-toast';

// Define types for photos
type PhotoType = 'image/jpeg' | 'image/png';
type PhotoView = typeof PHOTO_REQUIREMENTS.requiredViews[number];

// Explicit interfaces for better documentation and type safety
interface VehicleData {
    regPlate: string;
    make: string;
    model: string;
    year: number;
    owner: string;
    status: number; // Corresponds to VerificationStatus enum
    tier: number; // Corresponds to VerificationTier enum
    lastVerificationDate: bigint;
    isRegistered: boolean;
}

interface RiskData {
    baseValue: bigint;
    age: number;
    mileage: number;
    condition: number;
    riskScore: number;
    hasAccidentHistory: boolean;
    lastAssessment: bigint;
}

export interface Vehicle {
    regPlate: string;
    make: string;
    model: string;
    year: number;
    baseValue: bigint;
    mileage: number;
    condition: number;
    hasAccidentHistory: boolean;
    isRegistered: boolean;
    status?: number;
    tier?: number;
    lastVerificationDate?: bigint;
    riskScore?: number;
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
    const { readFromContract, writeToContract, getContractEvents, parseEventLogs } = useContract();
    const [isLoading, setIsLoading] = useState(false);
    
    // Add caching for vehicles
    const vehicleCache = useRef(new Map<string, Vehicle>());

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
            if (hash) {
                toast.success('Vehicle registered successfully');
                // Clear cache on successful registration
                vehicleCache.current.delete(regPlate);
            }
            
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

            // In a real implementation, you would upload photos to IPFS and get hashes
            // For this example, we're using placeholder hashes
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

    const getVehicleDetails = useCallback(async (regPlate: string): Promise<Vehicle | null> => {
        try {
            // Check cache first
            if (vehicleCache.current.has(regPlate)) {
                return vehicleCache.current.get(regPlate) || null;
            }
            
            // Get basic vehicle data from InsuranceCore contract
            const { data: vehicleData, error: vehicleError } = await readFromContract<VehicleData>(
                'InsuranceCore', 
                'vehicles', 
                [regPlate]
            );
            
            if (vehicleError || !vehicleData) {
                throw vehicleError || new Error('Vehicle not found');
            }
            
            // Get risk data from RiskAssessment contract
            const { data: riskData} = await readFromContract<RiskData>(
                'RiskAssessment', 
                'getVehicleRisk', 
                [regPlate]
            );
            
            // Combine data from both contracts
            const vehicle: Vehicle = {
                regPlate: vehicleData.regPlate,
                make: vehicleData.make,
                model: vehicleData.model,
                year: Number(vehicleData.year),
                baseValue: riskData ? riskData.baseValue : BigInt(0),
                mileage: riskData ? riskData.mileage : 0,
                condition: riskData ? riskData.condition : 0,
                hasAccidentHistory: riskData ? riskData.hasAccidentHistory : false,
                isRegistered: vehicleData.isRegistered,
                status: vehicleData.status,
                tier: vehicleData.tier,
                lastVerificationDate: vehicleData.lastVerificationDate,
                riskScore: riskData ? riskData.riskScore : 0
            };
            
            // Cache the result
            vehicleCache.current.set(regPlate, vehicle);
            return vehicle;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch vehicle details';
            console.error('Error fetching vehicle details:', error);
            toast.error(message);
            return null;
        }
    }, [readFromContract]);

    const getUserVehicles = useCallback(async (address: string): Promise<Vehicle[]> => {
        try {
            // Get vehicle registration events for this user
            const eventLogs = await getContractEvents(
                'InsuranceCore',
                'VehicleRegistered',
                { owner: address }
            );
            
            const parsedLogs = parseEventLogs(eventLogs, 'InsuranceCore', 'VehicleRegistered');
            
            if (parsedLogs.length === 0) return [];
            
            // Extract registration plates from events
            const regPlates = parsedLogs.map(log => {
                const regPlate = log.args.regPlate;
                return typeof regPlate === 'string' ? regPlate : '';
            }).filter(Boolean);
            
            // Get details for each vehicle
            const vehicles = await Promise.all(
                regPlates.map(regPlate => getVehicleDetails(regPlate))
            );
            
            return vehicles.filter((v): v is Vehicle => v !== null);
        } catch (error) {
            console.error('Error fetching user vehicles:', error);
            return [];
        }
    }, [getContractEvents, parseEventLogs, getVehicleDetails]);

    const getVehiclePhotos = useCallback(async (regPlate: string) => {
        try {
            const { data, error } = await readFromContract(
                'InsuranceCore',
                'vehiclePhotos',
                [regPlate]
            );
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching vehicle photos:', error);
            return null;
        }
    }, [readFromContract]);

    const getVehicleStatus = useCallback(async (regPlate: string): Promise<string> => {
        try {
            const vehicle = await getVehicleDetails(regPlate);
            
            if (!vehicle) return 'UNKNOWN';
            
            // Map status number to string
            const statusMap = ['PENDING', 'VERIFIED', 'REJECTED'];
            return vehicle.status !== undefined && vehicle.status < statusMap.length 
                ? statusMap[vehicle.status] 
                : 'UNKNOWN';
        } catch (error) {
            console.error('Error getting vehicle status:', error);
            return 'UNKNOWN';
        }
    }, [getVehicleDetails]);

    return {
        registerVehicle,
        uploadPhotos,
        getVehicleDetails,
        getUserVehicles,
        getVehiclePhotos,
        getVehicleStatus,
        isLoading,
    };
};