// Decides whether a buyer may insure a vehicle. Quotes are only signed for vehicles an
// assessor has verified for that owner, and are then priced from the verified details.
import { and, eq } from "drizzle-orm";
import type { VehicleProfile } from "@vehicle-shield/protocol";
import { schema, type Database } from "./db";

export type VerificationResult =
  | { approved: false }
  // `profile` is the assessor-confirmed vehicle to price from. Without one (testnets that
  // allow unverified vehicles), the request's own details are used.
  | { approved: true; profile?: VehicleProfile };

export interface VehicleVerifier {
  check(vehicleId: string, owner: string): Promise<VerificationResult>;
}

/// Approves every vehicle when `allowAll` is set, otherwise none. For tests.
export function staticVerifier(allowAll: boolean): VehicleVerifier {
  return { check: async () => (allowAll ? { approved: true } : { approved: false }) };
}

/// Approves vehicles an assessor verified for this owner. With `allowUnverified` (testnets
/// only), unverified vehicles are approved too and priced from the request.
export function databaseVerifier(db: Database, { allowUnverified = false } = {}): VehicleVerifier {
  return {
    async check(vehicleId, owner) {
      const [vehicle] = await db
        .select()
        .from(schema.vehicles)
        .where(
          and(
            eq(schema.vehicles.vehicleId, vehicleId),
            eq(schema.vehicles.owner, owner),
            eq(schema.vehicles.status, "verified"),
          ),
        );
      if (vehicle) {
        return {
          approved: true,
          profile: {
            year: vehicle.year,
            marketValue: vehicle.marketValue,
            mileageKm: vehicle.mileageKm,
            condition: vehicle.condition,
            accidentsLast3Years: vehicle.accidentsLast3Years,
            usage: vehicle.usage,
          },
        };
      }
      return allowUnverified ? { approved: true } : { approved: false };
    },
  };
}
