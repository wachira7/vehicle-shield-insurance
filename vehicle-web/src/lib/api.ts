// Calls to the quote API (vehicle-api) and the indexer (vehicle-indexer).
import type { CaptureMetadata } from "./images";

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
  notifyEmail?: boolean;
  notifySms?: boolean;
}

export const getProfile = (token: string) => request<{ address: string; profile: Profile | null }>("/v1/profile", { token });

export const saveProfile = (
  token: string,
  profile: { fullName: string; email: string; phone?: string; notifyEmail?: boolean; notifySms?: boolean },
) =>
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
  meta: CaptureMetadata = {},
): Promise<{ photoId: string; vehicle: Vehicle }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.set("view", view);
    form.set("file", file, `${view}.jpg`);
    form.set("meta", JSON.stringify(meta));
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
export async function fetchPhotoUrl(token: string, photoId: string, scope: "owner" | "assessor" = "owner"): Promise<string> {
  const path = scope === "assessor" ? `/v1/assessor/photos/${photoId}` : `/v1/photos/${photoId}`;
  const response = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new ApiError(response.status, {});
  return URL.createObjectURL(await response.blob());
}

// ---------------------------------------------------------------------------
// Policies (from the indexer)
// ---------------------------------------------------------------------------

export interface PolicySummary {
  id: string;
  holder?: string;
  purchaseTx?: string;
  vehicleId: string;
  coverage: string;
  premium: string;
  deductible: string;
  paidOut: string;
  startTime: string;
  endTime: string;
  status: "active" | "upcoming" | "expired" | "cancelled";
}

/// Policies covering an on-chain vehicle id, newest first (for the public cover check).
export async function listPoliciesForVehicle(vehicleId: string): Promise<PolicySummary[]> {
  const response = await fetch(`${INDEXER_URL}/v1/policies?vehicleId=${vehicleId}`);
  if (!response.ok) throw new ApiError(response.status, {});
  return (await response.json()).policies;
}

export async function listPolicies(holder: string): Promise<PolicySummary[] | null> {
  try {
    const response = await fetch(`${INDEXER_URL}/v1/policies?holder=${holder}`);
    return response.ok ? (await response.json()).policies : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Signed quotes
// ---------------------------------------------------------------------------

export interface SignedQuote {
  quote: {
    buyer: `0x${string}`;
    vehicleId: `0x${string}`;
    coverage: string;
    premium: string;
    deductible: string;
    duration: string;
    deadline: string;
    nonce: `0x${string}`;
  };
  signature: `0x${string}`;
  expiresAt: string;
  premiumUsdc: string;
  pricedFrom: "verified_vehicle" | "request";
}

export const requestSignedQuote = (body: EstimateInput & { buyer: string; plate: string }) =>
  request<SignedQuote>("/v1/quotes", { method: "POST", body: JSON.stringify(body) });

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export type ClaimStatus = "Submitted" | "UnderReview" | "Approved" | "Rejected" | "Paid";

export interface ClaimRecord {
  id: string;
  policyId: string;
  requestedAmount: string;
  approvedAmount: string | null;
  payoutAmount: string | null;
  evidenceUri: string;
  status: ClaimStatus;
  rejectionReason: string | null;
  submittedAt: string;
  updatedAt: string;
  timeline: { status: ClaimStatus; timestamp: string; txHash: string }[];
}

export interface PolicyDetail extends PolicySummary {
  claims: ClaimRecord[];
}

export async function fetchPolicyDetail(id: string): Promise<PolicyDetail | null> {
  try {
    const response = await fetch(`${INDEXER_URL}/v1/policies/${id}`);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export type EvidenceView = "overview" | "damage";

export interface EvidencePhoto {
  file: Blob;
  view: EvidenceView;
  meta: CaptureMetadata;
}

/// Uploads a claim's photos (encrypted by the API) and returns the evidence URI to submit on-chain.
/// At least one photo must be an "overview" of the whole car with its plate readable.
export function uploadClaimEvidence(
  token: string,
  policyId: string,
  description: string,
  photos: EvidencePhoto[],
  onProgress: (fraction: number) => void,
): Promise<{ evidenceUri: string; photos: { id: string }[] }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.set("policyId", policyId);
    if (description.trim()) form.set("description", description.trim());
    photos.forEach((photo, index) => {
      form.append("files", photo.file, `${photo.view}-${index + 1}.jpg`);
      form.append("views", photo.view);
      form.append("meta", JSON.stringify(photo.meta));
    });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/v1/claims/evidence`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    xhr.onload = () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as unknown as { evidenceUri: string; photos: { id: string }[] });
      else reject(new ApiError(xhr.status, body));
    };
    xhr.onerror = () => reject(new ApiError(0, { error: "unreachable" }));
    xhr.send(form);
  });
}

export const getMyEvidence = (token: string, uri: string) =>
  request<{ uri: string; policyId: string; description: string | null; photos: { id: string; view: EvidenceView | null }[] }>(
    `/v1/claims/evidence?uri=${encodeURIComponent(uri)}`,
    { token },
  );

/// Claims oldest first, optionally only those in the given statuses (the assessor's queue).
export async function listClaims(statuses?: ClaimStatus[]): Promise<Omit<ClaimRecord, "timeline">[]> {
  const query = statuses ? `?status=${statuses.join(",")}` : "";
  const response = await fetch(`${INDEXER_URL}/v1/claims${query}`);
  if (!response.ok) throw new ApiError(response.status, {});
  return (await response.json()).claims;
}

export async function fetchClaim(id: string): Promise<ClaimRecord | null> {
  const response = await fetch(`${INDEXER_URL}/v1/claims/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new ApiError(response.status, {});
  return response.json();
}

// ---------------------------------------------------------------------------
// Assessor console (needs a session from a wallet holding ASSESSOR_ROLE)
// ---------------------------------------------------------------------------

export type MatchContext =
  | { kind: "this-car-verification"; view: string | null }
  | { kind: "other-vehicle"; plate: string; sameOwner: boolean }
  | { kind: "other-claim"; policyId: string; sameOwner: boolean };

export type PhotoFlag =
  | { kind: "duplicate"; exact: boolean; distance: number; photoId: string; match: MatchContext }
  | { kind: "taken-before-policy"; capturedAt: string }
  | { kind: "taken-long-before-claim"; days: number }
  | { kind: "taken-after-upload" }
  | { kind: "no-metadata" };

export type SummaryFlag =
  | { kind: "no-overview" }
  | { kind: "several-cameras"; cameras: string[] }
  | { kind: "far-apart"; km: number };

export interface CheckedPhoto {
  id: string;
  view: string | null;
  capturedAt: string | null;
  gps: { lat: number; lon: number } | null;
  camera: string | null;
  flags: PhotoFlag[];
}

export interface ClaimReview {
  evidence: { uri: string; policyId: string; owner: string; description: string | null; createdAt: string };
  claimant: Profile | null;
  policy: { vehicleId: string; startTime: string } | null;
  vehicle: Vehicle | null;
  photos: CheckedPhoto[];
  flags: SummaryFlag[];
}

export interface AssessorVehicle extends Vehicle {
  owner: string;
  checks?: Record<string, Omit<CheckedPhoto, "id" | "view">>;
}

/// True when the session's wallet holds ASSESSOR_ROLE.
export async function isAssessor(token: string): Promise<boolean> {
  try {
    await request("/v1/assessor/me", { token });
    return true;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 401)) return false;
    throw error;
  }
}

export const getClaimReview = (token: string, uri: string) =>
  request<ClaimReview>(`/v1/assessor/claims/review?uri=${encodeURIComponent(uri)}`, { token });

export const listVehiclesForReview = (token: string, status: VehicleStatus = "pending") =>
  request<{ vehicles: AssessorVehicle[] }>(`/v1/assessor/vehicles?status=${status}`, { token });

export const getVehicleForReview = (token: string, id: string) => request<AssessorVehicle>(`/v1/assessor/vehicles/${id}`, { token });

export interface VehicleCorrections {
  year?: number;
  marketValueUsdc?: number;
  mileageKm?: number;
  condition?: number;
  accidentsLast3Years?: number;
  usage?: "private" | "commercial";
  note?: string;
}

export const verifyVehicle = (token: string, id: string, corrections: VehicleCorrections) =>
  request<AssessorVehicle>(`/v1/assessor/vehicles/${id}/verify`, { method: "POST", token, body: JSON.stringify(corrections) });

export const rejectVehicle = (token: string, id: string, note: string) =>
  request<AssessorVehicle>(`/v1/assessor/vehicles/${id}/reject`, { method: "POST", token, body: JSON.stringify({ note }) });

// ---------------------------------------------------------------------------
// Public cover check (no sign-in)
// ---------------------------------------------------------------------------

export interface PublicVehicle {
  make: string;
  model: string;
  year: number;
  plate: string; // masked, e.g. KCX•••B
}

export const checkPlate = (plate: string) =>
  request<{ vehicleId: string; vehicle: PublicVehicle | null }>(`/v1/public/check?plate=${encodeURIComponent(plate)}`);

export async function getPublicVehicle(vehicleId: string): Promise<PublicVehicle | null> {
  try {
    return await request<PublicVehicle>(`/v1/public/vehicles/${vehicleId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export interface DecisionRecord {
  claimId: string;
  status: "Approved" | "Rejected";
  timestamp: string;
  txHash: string;
  actor: string;
  claim: Omit<ClaimRecord, "timeline"> | null;
}

/// Claim approvals and declines, newest first, optionally by one assessor's wallet.
export async function listDecisions(actor?: string): Promise<DecisionRecord[]> {
  const response = await fetch(`${INDEXER_URL}/v1/decisions${actor ? `?actor=${actor}` : ""}`);
  if (!response.ok) throw new ApiError(response.status, {});
  return (await response.json()).decisions;
}

export const listMyVehicleDecisions = (token: string, status: "verified" | "rejected") =>
  request<{ vehicles: AssessorVehicle[] }>(`/v1/assessor/vehicles?status=${status}&mine=1`, { token });

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

export const listNotifications = (token: string) =>
  request<{ notifications: AppNotification[]; unread: number }>("/v1/notifications", { token });

/// Marks the given notifications read, or all of them.
export const markNotificationsRead = (token: string, ids?: string[]) =>
  request<{ ok: true }>("/v1/notifications/read", { method: "POST", token, body: JSON.stringify(ids ? { ids } : {}) });
