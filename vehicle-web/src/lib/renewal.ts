// Renewing is buying new cover for the same car with the previous policy's terms. The contract
// allows one active policy per car, so new cover can start only once the old one has ended.

export const renewHref = (vehicleRecordId: string, previousPolicyId: string) =>
  `/dashboard/vehicles/${vehicleRecordId}/buy?renew=${previousPolicyId}`;
