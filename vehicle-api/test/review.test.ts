import { describe, expect, it } from "vitest";
import { distanceKm, photoFlags, summaryFlags, type PhotoFacts } from "../src/review";

const base: PhotoFacts = {
  id: "p1",
  owner: "0xA",
  purpose: "claim",
  view: "damage",
  sha256: "aa",
  phash: "0f0f0f0f0f0f0f0f",
  capturedAt: new Date("2026-06-01T08:00:00Z"),
  gpsLat: null,
  gpsLon: null,
  camera: null,
  evidenceId: "e1",
  vehicleSubmissionId: null,
};
const uploadedAt = new Date("2026-06-01T10:00:00Z");
const flags = (photo: Partial<PhotoFacts>, candidates: Partial<PhotoFacts>[] = [], policyStart?: Date) =>
  photoFlags({
    photo: { ...base, ...photo },
    uploadedAt,
    policyStart,
    candidates: candidates.map((c, i) => ({ ...base, id: `c${i}`, sha256: `other${i}`, phash: null, ...c })),
    describeMatch: () => ({ kind: "other-claim", policyId: "9", sameOwner: false }),
  });

describe("photoFlags", () => {
  it("is quiet for a fresh, unique photo", () => {
    expect(flags({})).toEqual([]);
  });

  it("finds near-identical pictures by fingerprint and keeps the closest", () => {
    const result = flags({}, [{ phash: "0f0f0f0f0f0f0f00" }, { phash: "0f0f0f0f0f0f0f0e" }, { phash: "f0f0f0f0f0f0f0f0" }]);
    expect(result).toEqual([expect.objectContaining({ kind: "duplicate", exact: false, distance: 1, photoId: "c1" })]);
  });

  it("finds exact copies by hash even without a fingerprint", () => {
    expect(flags({ phash: null }, [{ sha256: "aa" }])).toEqual([expect.objectContaining({ kind: "duplicate", exact: true, distance: 0 })]);
  });

  it("questions when photos were taken", () => {
    expect(flags({ capturedAt: null })).toEqual([{ kind: "no-metadata" }]);
    expect(flags({ capturedAt: new Date("2026-04-01T00:00:00Z") }, [], new Date("2026-05-01T00:00:00Z"))).toEqual([
      { kind: "taken-before-policy", capturedAt: "2026-04-01T00:00:00.000Z" },
    ]);
    expect(flags({ capturedAt: new Date("2026-05-01T00:00:00Z") }, [], new Date("2026-01-01T00:00:00Z"))).toEqual([
      { kind: "taken-long-before-claim", days: 31 },
    ]);
    expect(flags({ capturedAt: new Date("2026-06-05T00:00:00Z") })).toEqual([{ kind: "taken-after-upload" }]);
  });
});

describe("summaryFlags", () => {
  it("wants an overview photo", () => {
    expect(summaryFlags([{ ...base, view: "damage" }])).toEqual([{ kind: "no-overview" }]);
    expect(summaryFlags([{ ...base, view: "overview" }])).toEqual([]);
  });

  it("notices several cameras and photos taken far apart", () => {
    const nairobi = { ...base, view: "overview", camera: "TECNO", gpsLat: -1.2921, gpsLon: 36.8219 };
    const mombasa = { ...base, camera: "Pixel", gpsLat: -4.0435, gpsLon: 39.6682 };
    const result = summaryFlags([nairobi, mombasa]);
    expect(result).toContainEqual({ kind: "several-cameras", cameras: ["TECNO", "Pixel"] });
    expect(result).toContainEqual(expect.objectContaining({ kind: "far-apart" }));
  });

  it("measures distance on the globe", () => {
    expect(distanceKm(-1.2921, 36.8219, -4.0435, 39.6682)).toBeCloseTo(440, -1);
  });
});
