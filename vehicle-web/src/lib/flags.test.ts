import { describe, expect, it } from "vitest";
import { collapseMissingMetadata, describeFlag, describeMatch, describeSummaryFlag, worstTone } from "./flags";

describe("describeFlag", () => {
  it("treats a reused verification photo as serious", () => {
    const text = describeFlag(
      { kind: "duplicate", exact: true, distance: 0, photoId: "p", match: { kind: "this-car-verification", view: "front" } },
      "claim",
      "2",
    );
    expect(text.tone).toBe("danger");
    expect(text.detail).toContain("this car's front verification photo");
  });

  it("words a re-upload on the same policy as a question, not an accusation", () => {
    const text = describeFlag(
      { kind: "duplicate", exact: true, distance: 0, photoId: "p", match: { kind: "other-claim", policyId: "2", sameOwner: true } },
      "claim",
      "2",
    );
    expect(text.tone).toBe("warn");
    expect(text.detail).toContain("another upload for this same policy");
  });

  it("is stronger about someone else's photo than the owner's own", () => {
    const other = describeFlag({ kind: "duplicate", exact: false, distance: 4, photoId: "p", match: { kind: "other-vehicle", plate: "KDA1", sameOwner: false } }, "vehicle");
    const own = describeFlag({ kind: "duplicate", exact: false, distance: 4, photoId: "p", match: { kind: "other-claim", policyId: "7", sameOwner: true } }, "claim", "2");
    expect(other.tone).toBe("danger");
    expect(other.detail).toMatch(/^Looks like the same picture as another owner's vehicle KDA1/);
    expect(own.tone).toBe("warn");
  });

  it("explains dates against the right reference", () => {
    expect(describeFlag({ kind: "taken-long-before-claim", days: 40 }, "claim").detail).toContain("before the claim was filed");
    expect(describeFlag({ kind: "taken-long-before-claim", days: 40 }, "vehicle").detail).toContain("before it was uploaded");
    expect(describeFlag({ kind: "no-metadata" }, "claim").tone).toBe("info");
  });
});

describe("summary and ranking", () => {
  it("describes claim-wide signs", () => {
    expect(describeSummaryFlag({ kind: "several-cameras", cameras: ["A", "B"] }).detail).toContain("A, B");
    expect(describeSummaryFlag({ kind: "no-overview" }).title).toBe("No overview photo");
  });

  it("picks the most serious tone", () => {
    expect(worstTone([])).toBeNull();
    expect(worstTone([{ tone: "info", title: "", detail: "" }, { tone: "danger", title: "", detail: "" }])).toBe("danger");
  });

  it("names where a match came from", () => {
    expect(describeMatch({ kind: "other-claim", policyId: "9", sameOwner: false }, "2")).toBe("a claim on policy #9 by a different owner");
  });
});

describe("collapseMissingMetadata", () => {
  const none = { flags: [{ kind: "no-metadata" as const }] };
  const dated = { flags: [] };
  it("says it once when no photo has capture details", () => {
    const result = collapseMissingMetadata([none, none]);
    expect(result.allMissing).toBe(true);
    expect(result.photos.every((photo) => photo.flags.length === 0)).toBe(true);
  });
  it("keeps per-photo flags when only some photos lack them", () => {
    expect(collapseMissingMetadata([none, dated])).toEqual({ photos: [none, dated], allMissing: false });
  });
});
