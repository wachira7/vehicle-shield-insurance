import { describe, expect, it } from "vitest";
import { decisionStats, formatDuration, timeAgo, waitingAge } from "./queue";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = new Date("2026-10-24T15:00:00").getTime();

describe("waitingAge", () => {
  it("labels the wait and turns amber after 2 days, red after 5", () => {
    expect(waitingAge(now - 3 * HOUR, now)).toEqual({ label: "3 h", tone: "ok" });
    expect(waitingAge(now - 2 * DAY, now)).toEqual({ label: "2 d", tone: "warn" });
    expect(waitingAge(now - 6 * DAY, now)).toEqual({ label: "6 d", tone: "late" });
    expect(waitingAge(now + HOUR, now).label).toBe("just now");
  });

  it("says how long ago", () => {
    expect(timeAgo(60_000)).toBe("just now");
    expect(timeAgo(3 * HOUR)).toBe("3 h ago");
  });

  it("formats short durations", () => {
    expect(formatDuration(2 * 60_000)).toBe("just now");
    expect(formatDuration(20 * 60_000)).toBe("20 min");
  });
});

describe("decisionStats", () => {
  it("counts today's decisions and averages the last 30 days", () => {
    const stats = decisionStats(
      [
        { kind: "claim", arrivedAt: now - 5 * HOUR, decidedAt: now - HOUR }, // 4 h, today
        { kind: "vehicle", arrivedAt: now - 3 * DAY, decidedAt: now - 2 * DAY }, // 24 h
        { kind: "claim", arrivedAt: now - 60 * DAY, decidedAt: now - 50 * DAY }, // too old to average
      ],
      now,
    );
    expect(stats.today).toBe(1);
    expect(stats.last30Days).toBe(2);
    expect(stats.averageMs).toBe(14 * HOUR);
  });

  it("has no average without decisions", () => {
    expect(decisionStats([], now)).toEqual({ today: 0, last30Days: 0, averageMs: null });
  });
});
