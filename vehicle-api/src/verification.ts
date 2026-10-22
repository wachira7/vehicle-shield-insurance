// Decides whether a buyer may insure a vehicle. Quotes are only signed for vehicles an
// assessor has verified for that owner; the assessor workflow will back this with storage.
export interface VehicleVerifier {
  isApproved(vehicleId: string, owner: string): Promise<boolean>;
}

/// Approves every vehicle when `allowAll` is set (testnet only), otherwise none.
export function staticVerifier(allowAll: boolean): VehicleVerifier {
  return { isApproved: async () => allowAll };
}
