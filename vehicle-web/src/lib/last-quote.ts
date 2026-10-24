// The quote page remembers the last car priced (this browser tab only), so adding the
// vehicle afterwards starts from the same details.
import type { VehicleFormValues } from "@/components/vehicle-form";

const KEY = "vehicleshield.lastQuote";

export function saveLastQuote(values: Partial<VehicleFormValues>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(values));
  } catch {}
}

export function readLastQuote(): Partial<VehicleFormValues> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
