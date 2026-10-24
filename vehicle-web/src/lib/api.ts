// Calls to the quote API (vehicle-api) and the indexer (vehicle-indexer).

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
export const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:42069";

export interface VehicleInput {
  year: number;
  marketValueUsdc: number;
  mileageKm: number;
  condition: number;
  accidentsLast3Years: number;
  usage: "private" | "commercial";
}

export interface EstimateInput {
  vehicle: VehicleInput;
  coverageUsdc: number;
  deductibleUsdc: number;
  durationDays: number;
}

export interface PriceFactor {
  name: string;
  reason: string;
  multiplier: number;
}

export interface Estimate {
  premiumUsdc: string;
  annualPremiumUsdc: string;
  factors: PriceFactor[];
  pricingVersion: string;
}

export type EstimateResult =
  | { kind: "priced"; estimate: Estimate }
  | { kind: "declined"; reasons: string[] }
  | { kind: "error"; message: string };

export async function estimateQuote(input: EstimateInput, signal?: AbortSignal): Promise<EstimateResult> {
  try {
    const response = await fetch(`${API_URL}/v1/quotes/estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    const body = await response.json();
    if (response.ok) return { kind: "priced", estimate: body };
    if (response.status === 422) return { kind: "declined", reasons: body.reasons };
    if (response.status === 400) return { kind: "error", message: "Check the highlighted details and try again." };
    return { kind: "error", message: "We couldn't price this right now. Please try again." };
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    return { kind: "error", message: "We couldn't reach the pricing service. Check your connection and try again." };
  }
}

export interface PoolStats {
  policiesSold: number;
  premiumsCollected: string;
  claimsPaid: number;
  payoutsTotal: string;
  poolFunded: string;
  poolWithdrawn: string;
  refundsPaid: string;
}

/// Pool totals for the public stats; null when the indexer is unreachable.
export async function fetchPoolStats(): Promise<PoolStats | null> {
  try {
    const response = await fetch(`${INDEXER_URL}/v1/stats`, { next: { revalidate: 30 } });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

/// USDC currently backing claims: funding + premiums − refunds − payouts − withdrawals.
export function poolBalanceUnits(stats: PoolStats): bigint {
  return (
    BigInt(stats.poolFunded) +
    BigInt(stats.premiumsCollected) -
    BigInt(stats.refundsPaid) -
    BigInt(stats.payoutsTotal) -
    BigInt(stats.poolWithdrawn)
  );
}

// ---------------------------------------------------------------------------
// Sign-in and profile (need the session token from Sign-In with Ethereum)
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super(String(body.reason ?? body.error ?? `Request failed (${status})`));
  }
}

async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        ...(rest.body && typeof rest.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(0, { error: "unreachable" });
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

export const getNonce = () => request<{ nonce: string }>("/v1/auth/nonce");

export const verifySignIn = (message: string, signature: string) =>
  request<{ token: string; address: `0x${string}`; expiresAt: string }>("/v1/auth/verify", {
    method: "POST",
    body: JSON.stringify({ message, signature }),
  });

export interface Profile {
  fullName: string;
  email: string;
  phone: string | null;
}

export const getProfile = (token: string) => request<{ address: string; profile: Profile | null }>("/v1/profile", { token });

export const saveProfile = (token: string, profile: { fullName: string; email: string; phone?: string }) =>
  request<{ address: string; profile: Profile }>("/v1/profile", { method: "PUT", token, body: JSON.stringify(profile) });

// ---------------------------------------------------------------------------
// Vehicles and photos
// ---------------------------------------------------------------------------

export const PHOTO_VIEWS = ["front", "back", "left", "right", "interior", "odometer"] as const;
export type PhotoView = (typeof PHOTO_VIEWS)[number];

export type VehicleStatus = "pending" | "verified" | "rejected";

export interface Vehicle {
  id: string;
  plate: string;
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  marketValueUsdc: string;
  mileageKm: number;
  condition: number;
  accidentsLast3Years: number;
  usage: "private" | "commercial";
  status: VehicleStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  photos: { id: string; view: PhotoView; createdAt: string }[];
  missingViews: PhotoView[];
}

export interface VehicleInputFull extends VehicleInput {
  plate: string;
  make: string;
  model: string;
}

export const listVehicles = (token: string) => request<{ vehicles: Vehicle[] }>("/v1/vehicles", { token });

export const submitVehicle = (token: string, vehicle: VehicleInputFull) =>
  request<Vehicle>("/v1/vehicles", { method: "POST", token, body: JSON.stringify(vehicle) });

/// Uploads one photo with progress (fetch can't report upload progress, so this uses XHR).
export function uploadVehiclePhoto(
  token: string,
  vehicleId: string,
  view: PhotoView,
  file: Blob,
  onProgress: (fraction: number) => void,
): Promise<{ photoId: string; vehicle: Vehicle }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.set("view", view);
    form.set("file", file, `${view}.jpg`);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/v1/vehicles/${vehicleId}/photos`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    xhr.onload = () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as unknown as { photoId: string; vehicle: Vehicle });
      else reject(new ApiError(xhr.status, body));
    };
    xhr.onerror = () => reject(new ApiError(0, { error: "unreachable" }));
    xhr.send(form);
  });
}

/// A decrypted photo the signed-in owner can display (as an object URL; revoke when done).
export async function fetchPhotoUrl(token: string, photoId: string): Promise<string> {
  const response = await fetch(`${API_URL}/v1/photos/${photoId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new ApiError(response.status, {});
  return URL.createObjectURL(await response.blob());
}

// ---------------------------------------------------------------------------
// Policies (from the indexer)
// ---------------------------------------------------------------------------

export interface PolicySummary {
  id: string;
  vehicleId: string;
  coverage: string;
  premium: string;
  deductible: string;
  paidOut: string;
  startTime: string;
  endTime: string;
  status: "active" | "upcoming" | "expired" | "cancelled";
}

export async function listPolicies(holder: string): Promise<PolicySummary[] | null> {
  try {
    const response = await fetch(`${INDEXER_URL}/v1/policies?holder=${holder}`);
    return response.ok ? (await response.json()).policies : null;
  } catch {
    return null;
  }
}
