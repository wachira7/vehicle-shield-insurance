// Warning signs on a claim's photos, for the assessor to weigh. None of these decide a claim on
// their own: metadata can be missing for innocent reasons (screenshots, messaging apps strip
// it) and can be faked, and a fingerprint match can be a near-identical angle of the same car.

import { hammingDistance, SIMILAR_BITS } from "./forensics";

export interface PhotoFacts {
  id: string;
  owner: string;
  purpose: "vehicle" | "claim";
  view: string | null;
  sha256: string;
  phash: string | null;
  capturedAt: Date | null;
  gpsLat: number | null;
  gpsLon: number | null;
  camera: string | null;
  evidenceId: string | null;
  vehicleSubmissionId: string | null;
}

/// Where a matching photo came from, as far as the assessor needs to know.
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

const DAY_MS = 86_400_000;
/// Photos taken more than this long before the claim was filed are worth a question.
export const STALE_DAYS = 14;
export const FAR_APART_KM = 50;

export function photoFlags({
  photo,
  uploadedAt,
  policyStart,
  candidates,
  describeMatch,
}: {
  photo: PhotoFacts;
  uploadedAt: Date;
  policyStart?: Date;
  candidates: PhotoFacts[]; // every other stored photo outside this claim's evidence
  describeMatch: (match: PhotoFacts) => MatchContext;
}): PhotoFlag[] {
  const flags: PhotoFlag[] = [];

  // The closest earlier match is enough: one strong lead beats a list of weak ones.
  let best: { photo: PhotoFacts; distance: number } | undefined;
  for (const other of candidates) {
    const distance =
      other.sha256 === photo.sha256 ? 0 : photo.phash && other.phash ? hammingDistance(photo.phash, other.phash) : Infinity;
    if (distance <= SIMILAR_BITS && (!best || distance < best.distance)) best = { photo: other, distance };
  }
  if (best) {
    flags.push({
      kind: "duplicate",
      exact: best.photo.sha256 === photo.sha256,
      distance: best.distance,
      photoId: best.photo.id,
      match: describeMatch(best.photo),
    });
  }

  if (!photo.capturedAt) {
    flags.push({ kind: "no-metadata" });
  } else {
    const taken = photo.capturedAt.getTime();
    if (policyStart && taken < policyStart.getTime()) {
      flags.push({ kind: "taken-before-policy", capturedAt: photo.capturedAt.toISOString() });
    } else if (uploadedAt.getTime() - taken > STALE_DAYS * DAY_MS) {
      flags.push({ kind: "taken-long-before-claim", days: Math.floor((uploadedAt.getTime() - taken) / DAY_MS) });
    }
    if (taken - uploadedAt.getTime() > DAY_MS) flags.push({ kind: "taken-after-upload" });
  }
  return flags;
}

export function summaryFlags(photos: PhotoFacts[]): SummaryFlag[] {
  const flags: SummaryFlag[] = [];
  if (!photos.some((photo) => photo.view === "overview")) flags.push({ kind: "no-overview" });

  const cameras = [...new Set(photos.map((photo) => photo.camera).filter((camera): camera is string => Boolean(camera)))];
  if (cameras.length > 1) flags.push({ kind: "several-cameras", cameras });

  const located = photos.filter((photo) => photo.gpsLat !== null && photo.gpsLon !== null);
  let km = 0;
  for (const [i, a] of located.entries()) {
    for (const b of located.slice(i + 1)) km = Math.max(km, distanceKm(a.gpsLat!, a.gpsLon!, b.gpsLat!, b.gpsLon!));
  }
  if (km > FAR_APART_KM) flags.push({ kind: "far-apart", km: Math.round(km) });
  return flags;
}

/// Great-circle distance (haversine).
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
