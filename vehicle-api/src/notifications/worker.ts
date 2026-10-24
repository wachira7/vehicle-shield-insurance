// Turns on-chain activity into notifications. It reads the indexer's activity feed from where
// it last stopped (kept in job_state) and, about hourly, looks for cover that's ending soon or
// has just ended. Every notification has a stable key, so re-reading the same events is safe.
import { eq } from "drizzle-orm";
import { schema, type Database } from "../db";
import { messages } from "./messages";
import type { Notifier } from "./notifier";

interface IndexedClaim {
  id: string;
  claimant: string;
  requestedAmount: string;
  payoutAmount: string | null;
  rejectionReason: string | null;
  paidTo: string | null;
}

export interface ClaimEventItem {
  claimId: string;
  status: "Submitted" | "UnderReview" | "Approved" | "Rejected" | "Paid";
  timestamp: string;
  claim: IndexedClaim | null;
}

export interface PolicyItem {
  id: string;
  buyer: string;
  holder: string;
  startTime: string;
  endTime: string;
  cancelled: boolean;
  cancelledAt: string | null;
  refund: string | null;
}

export interface ActivityFeed {
  activity(since: bigint): Promise<{ claimEvents: ClaimEventItem[]; policies: PolicyItem[] }>;
  /// Policies not cancelled whose cover ends in [after, before), unix seconds.
  policiesEnding(after: bigint, before: bigint): Promise<PolicyItem[]>;
}

export function indexerFeed(indexerUrl: string, fetchImpl: typeof fetch = fetch): ActivityFeed {
  const get = async <T>(path: string): Promise<T> => {
    const response = await fetchImpl(`${indexerUrl}${path}`, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Indexer ${path} answered ${response.status}`);
    return response.json() as Promise<T>;
  };
  return {
    activity: (since) => get(`/v1/activity?since=${since}`),
    policiesEnding: async (after, before) =>
      (await get<{ policies: PolicyItem[] }>(`/v1/policies?endAfter=${after}&endBefore=${before}`)).policies,
  };
}

const DAY = 86_400n;
const REMINDER_EVERY_MS = 60 * 60 * 1000;

export function notificationWorker({
  db,
  notifier,
  feed,
  now = () => new Date(),
  log = console.error,
}: {
  db: Database;
  notifier: Notifier;
  feed: ActivityFeed;
  now?: () => Date;
  log?: (...args: unknown[]) => void;
}) {
  const getState = async (key: string) => (await db.select().from(schema.jobState).where(eq(schema.jobState.key, key)))[0]?.value;
  const setState = (key: string, value: string) =>
    db
      .insert(schema.jobState)
      .values({ key, value, updatedAt: now() })
      .onConflictDoUpdate({ target: schema.jobState.key, set: { value, updatedAt: now() } });

  async function claimEvent(event: ClaimEventItem) {
    const claim = event.claim;
    if (!claim) return;
    const key = `claim:${claim.id}:${event.status}`;
    switch (event.status) {
      case "Submitted":
        await notifier.notify(claim.claimant, key, messages.claimReceived({ id: claim.id, amount: claim.requestedAmount }));
        await notifier.notifyAssessors(`claim-filed:${claim.id}`, messages.claimFiled({ id: claim.id, amount: claim.requestedAmount }));
        return;
      case "UnderReview":
        return notifier.notify(claim.claimant, key, messages.claimUnderReview({ id: claim.id }));
      case "Approved":
        return notifier.notify(claim.claimant, key, messages.claimApproved({ id: claim.id, payout: claim.payoutAmount ?? "0" }));
      case "Rejected":
        return notifier.notify(claim.claimant, key, messages.claimDeclined({ id: claim.id, reason: claim.rejectionReason }));
      case "Paid":
        return notifier.notify(claim.paidTo ?? claim.claimant, key, messages.claimPaid({ id: claim.id, payout: claim.payoutAmount ?? "0" }));
    }
  }

  async function readActivity(nowSeconds: bigint) {
    const saved = await getState("activity-since");
    // On the very first run, start from now rather than notifying about all of history.
    if (saved === undefined) return setState("activity-since", nowSeconds.toString());
    const since = BigInt(saved);
    const { claimEvents, policies } = await feed.activity(since);
    let latest = since;
    for (const event of claimEvents) {
      await claimEvent(event);
      if (BigInt(event.timestamp) > latest) latest = BigInt(event.timestamp);
    }
    for (const policy of policies) {
      if (BigInt(policy.startTime) >= since) {
        await notifier.notify(policy.buyer, `policy:${policy.id}:bought`, messages.policyBought({ id: policy.id, endTime: policy.endTime }));
        if (BigInt(policy.startTime) > latest) latest = BigInt(policy.startTime);
      }
      if (policy.cancelled && policy.cancelledAt && BigInt(policy.cancelledAt) >= since) {
        await notifier.notify(policy.holder, `policy:${policy.id}:cancelled`, messages.policyCancelled({ id: policy.id, refund: policy.refund }));
        if (BigInt(policy.cancelledAt) > latest) latest = BigInt(policy.cancelledAt);
      }
    }
    await setState("activity-since", latest.toString());
  }

  async function sendReminders(nowSeconds: bigint) {
    const last = await getState("reminders-at");
    if (last && now().getTime() - Number(last) < REMINDER_EVERY_MS) return;
    for (const policy of await feed.policiesEnding(nowSeconds, nowSeconds + 30n * DAY)) {
      const days = Number((BigInt(policy.endTime) - nowSeconds + DAY - 1n) / DAY);
      const window = days <= 7 ? 7 : 30;
      await notifier.notify(policy.holder, `policy:${policy.id}:renewal-${window}`, messages.renewalDue({ id: policy.id, endTime: policy.endTime, days }));
    }
    for (const policy of await feed.policiesEnding(nowSeconds - 3n * DAY, nowSeconds)) {
      await notifier.notify(policy.holder, `policy:${policy.id}:expired`, messages.policyExpired({ id: policy.id }));
    }
    await setState("reminders-at", String(now().getTime()));
  }

  async function runOnce() {
    const nowSeconds = BigInt(Math.floor(now().getTime() / 1000));
    await readActivity(nowSeconds);
    await sendReminders(nowSeconds);
  }

  return {
    runOnce,
    /// Runs every `intervalMs` until stopped; one failed run is logged and the next retries.
    start(intervalMs: number) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let stopped = false;
      const tick = async () => {
        try {
          await runOnce();
        } catch (error) {
          log("Notification worker:", error instanceof Error ? error.message : error);
        }
        if (!stopped) timer = setTimeout(tick, intervalMs);
      };
      void tick();
      return () => {
        stopped = true;
        clearTimeout(timer);
      };
    },
  };
}
