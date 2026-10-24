// How long things have waited, and how quickly an assessor decides: the numbers behind the
// console's queues and overview. Times are milliseconds since the epoch.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/// Customers start to worry after a couple of days; after five, a claim is overdue.
export const WAIT_WARN_DAYS = 2;
export const WAIT_LATE_DAYS = 5;

export type WaitTone = "ok" | "warn" | "late";

/// "just now", "5 h", "3 d"
export function formatDuration(ms: number): string {
  if (ms < HOUR) return ms < 5 * 60_000 ? "just now" : `${Math.floor(ms / 60_000)} min`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)} h`;
  return `${Math.floor(ms / DAY)} d`;
}

export function waitingAge(since: number, now = Date.now()): { label: string; tone: WaitTone } {
  const waited = Math.max(0, now - since);
  return {
    label: formatDuration(waited),
    tone: waited >= WAIT_LATE_DAYS * DAY ? "late" : waited >= WAIT_WARN_DAYS * DAY ? "warn" : "ok",
  };
}

export interface Decision {
  kind: "claim" | "vehicle";
  decidedAt: number;
  /// When the item arrived for review (claim filed, vehicle submitted).
  arrivedAt: number;
}

/// Decisions made today (local time) and the average time to a decision over the last 30 days.
export function decisionStats(decisions: Decision[], now = Date.now()) {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const recent = decisions.filter((decision) => now - decision.decidedAt <= 30 * DAY);
  const waits = recent.map((decision) => Math.max(0, decision.decidedAt - decision.arrivedAt));
  return {
    today: decisions.filter((decision) => decision.decidedAt >= startOfDay.getTime()).length,
    last30Days: recent.length,
    averageMs: waits.length ? waits.reduce((sum, ms) => sum + ms, 0) / waits.length : null,
  };
}
