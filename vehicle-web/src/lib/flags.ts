// Plain-language wording for the API's photo warning signs. Each one is a prompt for the
// assessor to look closer, never a verdict, so the copy says what was found and what to check.
import type { MatchContext, PhotoFlag, SummaryFlag } from "./api";

export type Tone = "danger" | "warn" | "info";

export interface FlagText {
  tone: Tone;
  title: string;
  detail: string;
}

const VIEW_NAMES: Record<string, string> = {
  front: "front",
  back: "back",
  left: "left side",
  right: "right side",
  interior: "interior",
  odometer: "odometer",
  overview: "overview",
  damage: "damage",
};

/// Where a matching photo was found, e.g. "this car's front verification photo".
export function describeMatch(match: MatchContext, policyId?: string): string {
  switch (match.kind) {
    case "this-car-verification":
      return `this car's ${VIEW_NAMES[match.view ?? ""] ?? ""} verification photo`.replace("  ", " ");
    case "other-vehicle":
      return `${match.sameOwner ? "the same owner's" : "another owner's"} vehicle ${match.plate}`;
    case "other-claim":
      if (match.policyId === policyId) return "another upload for this same policy";
      return `a claim on policy #${match.policyId}${match.sameOwner ? " by the same owner" : " by a different owner"}`;
  }
}

/// `subject` is "claim" for claim photos (dates compare with the policy and the filing date) or
/// "vehicle" for verification photos (dates compare with the upload).
export function describeFlag(flag: PhotoFlag, subject: "claim" | "vehicle", policyId?: string): FlagText {
  switch (flag.kind) {
    case "duplicate": {
      const where = describeMatch(flag.match, policyId);
      const what = flag.exact ? "The exact same file as" : "Looks like the same picture as";
      if (flag.match.kind === "this-car-verification") {
        return {
          tone: "danger",
          title: "Reused verification photo",
          detail: `${what} ${where}, taken before cover started. Damage in it may be older than the policy.`,
        };
      }
      if (flag.match.kind === "other-claim" && flag.match.policyId === policyId) {
        return {
          tone: "warn",
          title: "Uploaded before",
          detail: `${what} ${where}: a retried submission, or the same damage claimed twice. Check this policy's other claims.`,
        };
      }
      return {
        // Someone else's photo is a stronger sign than the same owner reusing their own.
        tone: flag.match.sameOwner ? "warn" : "danger",
        title: "Photo used elsewhere",
        detail: `${what} ${where}.`,
      };
    }
    case "taken-before-policy":
      return {
        tone: "danger",
        title: "Taken before cover started",
        detail: `Taken ${new Date(flag.capturedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, before the policy began.`,
      };
    case "taken-long-before-claim":
      return {
        tone: "warn",
        title: "Older photo",
        detail:
          subject === "claim"
            ? `Taken ${flag.days} days before the claim was filed.`
            : `Taken ${flag.days} days before it was uploaded. Ask for a fresh photo if the car may have changed.`,
      };
    case "taken-after-upload":
      return { tone: "warn", title: "Date doesn't add up", detail: "The photo says it was taken after it was uploaded: the camera clock is wrong or the data was edited." };
    case "no-metadata":
      return {
        tone: "info",
        title: "No capture details",
        detail: "No date, place or camera recorded. Common for screenshots and photos sent through chat apps.",
      };
  }
}

export function describeSummaryFlag(flag: SummaryFlag): FlagText {
  switch (flag.kind) {
    case "no-overview":
      return { tone: "warn", title: "No overview photo", detail: "No photo shows the whole car with its plate, so it can't be matched to the insured car." };
    case "several-cameras":
      return { tone: "warn", title: "Several cameras", detail: `Photos come from ${flag.cameras.join(", ")}. Ask who took them.` };
    case "far-apart":
      return { tone: "warn", title: "Taken far apart", detail: `Photos were taken up to ${flag.km} km apart.` };
  }
}

const RANK: Record<Tone, number> = { danger: 0, warn: 1, info: 2 };

/// The most serious tone among some flags, or null when there are none.
export function worstTone(texts: FlagText[]): Tone | null {
  return texts.reduce<Tone | null>((worst, text) => (worst === null || RANK[text.tone] < RANK[worst] ? text.tone : worst), null);
}

/// When no photo has capture details, saying so under each one is noise: drop the per-photo
/// "no-metadata" flags and let the caller say it once. Returns whether that happened.
export function collapseMissingMetadata<T extends { flags: PhotoFlag[] }>(photos: T[]): { photos: T[]; allMissing: boolean } {
  const allMissing = photos.length > 1 && photos.every((photo) => photo.flags.some((flag) => flag.kind === "no-metadata"));
  if (!allMissing) return { photos, allMissing };
  return { photos: photos.map((photo) => ({ ...photo, flags: photo.flags.filter((flag) => flag.kind !== "no-metadata") })), allMissing };
}
