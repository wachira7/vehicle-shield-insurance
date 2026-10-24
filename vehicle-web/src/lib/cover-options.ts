// The choices offered when buying cover. Bounds mirror the pricing rules: cover from $200 up to
// the car's verified value; a deductible of at least $50 and at most 20% of the cover.

export const DURATIONS = [
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
];

export const MIN_COVER = 200;

export function coverBounds(vehicleValue: number) {
  const max = Math.max(MIN_COVER, Math.floor(vehicleValue / 100) * 100);
  const suggested = Math.min(max, Math.max(MIN_COVER, Math.round((vehicleValue * 0.8) / 100) * 100));
  return { min: MIN_COVER, max, suggested };
}

/// Three deductible choices (about 5%, 10% and 15% of the cover), rounded to $50, valid and distinct.
export function deductibleOptions(cover: number): number[] {
  const max = Math.floor((cover * 0.2) / 50) * 50;
  const options = [0.05, 0.1, 0.15]
    .map((share) => Math.max(50, Math.round((cover * share) / 50) * 50))
    .filter((amount) => amount <= max);
  const unique = [...new Set(options)];
  return unique.length ? unique : [50];
}

/// "14:05" for the time left on a quote.
export function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
