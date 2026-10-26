import { randomBytes } from "node:crypto";
import { Wallet } from "ethers";
import { eq } from "drizzle-orm";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { deployments } from "@vehicle-shield/protocol";
import { createApp } from "../src/app";
import { openDatabase, schema, type Database } from "../src/db";
import { africasTalkingSms, renderEmail, resendEmail, type Email, type Sms } from "../src/notifications/channels";
import { messages, usd } from "../src/notifications/messages";
import { createNotifier } from "../src/notifications/notifier";
import { notificationWorker, type ActivityFeed, type ClaimEventItem, type PolicyItem } from "../src/notifications/worker";
import { PHOTO_VIEWS } from "../src/photos";
import { memoryStore } from "../src/storage";
import { databaseVerifier } from "../src/verification";

let db: Database;
let closeDb: () => Promise<void>;
beforeAll(async () => {
  ({ db, close: closeDb } = await openDatabase("pglite:"));
});
afterAll(() => closeDb());

const owner = privateKeyToAccount(generatePrivateKey());
const assessor = privateKeyToAccount(generatePrivateKey());
const stranger = privateKeyToAccount(generatePrivateKey());

/// Channels that record what they'd send, and can be told to fail.
function recorder() {
  const sent = { emails: [] as Email[], texts: [] as Sms[] };
  const fail = { email: false, sms: false };
  return {
    sent,
    fail,
    channels: {
      email: async (email: Email) => {
        if (fail.email) throw new Error("email down");
        sent.emails.push(email);
      },
      sms: async (sms: Sms) => {
        if (fail.sms) throw new Error("sms down");
        sent.texts.push(sms);
      },
    },
  };
}

async function register(address: string, profile: Partial<typeof schema.profiles.$inferInsert> = {}) {
  await db
    .insert(schema.profiles)
    .values({ address, fullName: "Test Person", email: `${address.slice(2, 8)}@example.com`, phone: "+254712345678", ...profile })
    .onConflictDoUpdate({ target: schema.profiles.address, set: { notifyEmail: true, notifySms: true, ...profile } });
}

const rowsFor = (address: string) => db.select().from(schema.notifications).where(eq(schema.notifications.recipient, address));

beforeEach(async () => {
  await db.delete(schema.notifications);
  await db.delete(schema.jobState);
  await register(owner.address);
  await register(assessor.address, { phone: "+254700000000" });
});

describe("messages", () => {
  it("keeps every text message to one SMS, even with long details", () => {
    const long = "x".repeat(400);
    const all = [
      messages.vehicleVerified({ id: "v", plate: "KCX456B", make: long, model: long }),
      messages.vehicleSentBack({ id: "v", plate: "KCX456B", note: long }),
      messages.claimReceived({ id: "123456", amount: 999_999_000_000n }),
      messages.claimApproved({ id: "1", payout: 550_000_000n }),
      messages.claimDeclined({ id: "1", reason: long }),
      messages.policyBought({ id: "2", endTime: 1_824_000_000n }),
      messages.renewalDue({ id: "2", endTime: 1_824_000_000n, days: 7 }),
    ];
    for (const message of all) expect(message.sms!.length).toBeLessThanOrEqual(160);
  });

  it("formats amounts and leaves staff notices out of SMS", () => {
    expect(usd(550_000_000n)).toBe("$550.00");
    expect(usd("1250000000")).toBe("$1,250.00");
    expect(messages.claimFiled({ id: "1", amount: 1n }).sms).toBeUndefined();
    expect(messages.vehicleReady({ id: "v", plate: "A", make: "B", model: "C" }).sms).toBeUndefined();
  });

  it("picks the renewal window from the days left", () => {
    expect(messages.renewalDue({ id: "1", endTime: 0n, days: 25 }).kind).toBe("renewal-30");
    expect(messages.renewalDue({ id: "1", endTime: 0n, days: 1 })).toMatchObject({ kind: "renewal-7", title: "Your cover ends in 1 day" });
  });
});

describe("channels", () => {
  it("sends email through Resend", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await resendEmail({ apiKey: "re_test", from: "VehicleShield <hello@example.com>", fetchImpl })({ to: "a@b.co", subject: "Hi", text: "t", html: "<p>h</p>" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    expect(JSON.parse(String(init.body))).toMatchObject({ from: "VehicleShield <hello@example.com>", to: ["a@b.co"], subject: "Hi" });

    const failing = resendEmail({ apiKey: "x", from: "y", fetchImpl: async () => new Response("bad from", { status: 422 }) });
    await expect(failing({ to: "a@b.co", subject: "", text: "", html: "" })).rejects.toThrow(/422/);
  });

  it("sends SMS through Africa's Talking, using the sandbox for the sandbox user", async () => {
    const ok = () => new Response(JSON.stringify({ SMSMessageData: { Recipients: [{ status: "Success" }] } }), { status: 201 });
    const fetchImpl = vi.fn(async () => ok());
    await africasTalkingSms({ username: "sandbox", apiKey: "atsk", fetchImpl })({ to: "+254712345678", text: "Hello" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.sandbox.africastalking.com/version1/messaging");
    expect((init.headers as Record<string, string>).apiKey).toBe("atsk");
    expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toEqual({ username: "sandbox", to: "+254712345678", message: "Hello" });

    const live = vi.fn(async () => ok());
    await africasTalkingSms({ username: "vehicleshield", apiKey: "k", senderId: "VSHIELD", fetchImpl: live })({ to: "+254712345678", text: "x" });
    const [liveUrl, liveInit] = live.mock.calls[0] as unknown as [string, RequestInit];
    expect(liveUrl).toBe("https://api.africastalking.com/version1/messaging");
    expect(new URLSearchParams(String(liveInit.body)).get("from")).toBe("VSHIELD");

    const rejected = africasTalkingSms({
      username: "sandbox",
      apiKey: "k",
      fetchImpl: async () => new Response(JSON.stringify({ SMSMessageData: { Recipients: [{ status: "InvalidPhoneNumber" }] } }), { status: 201 }),
    });
    await expect(rejected({ to: "+1", text: "x" })).rejects.toThrow(/InvalidPhoneNumber/);
  });

  it("renders a safe email with the link", () => {
    const { html, text } = renderEmail({ title: "<script>", body: "Tom & Jerry", url: "https://app.example/x" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Tom &#38; Jerry");
    expect(text).toContain("https://app.example/x");
  });
});

describe("notifier", () => {
  const make = (rec = recorder()) => ({
    rec,
    notifier: createNotifier({ db, channels: rec.channels, appUrl: "https://app.example", isAssessor: async (a) => a === assessor.address, log: () => {} }),
  });

  it("notifies once per event, in the app and by email and SMS", async () => {
    const { rec, notifier } = make();
    const message = messages.claimApproved({ id: "7", payout: 550_000_000n });
    await notifier.notify(owner.address.toLowerCase(), "claim:7:Approved", message);
    await notifier.notify(owner.address, "claim:7:Approved", message);

    const rows = await rowsFor(owner.address);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "claim-approved", link: "/dashboard/claims/7", email: "sent", sms: "sent" });
    expect(rec.sent.emails).toHaveLength(1);
    expect(rec.sent.emails[0].html).toContain("https://app.example/dashboard/claims/7");
    expect(rec.sent.texts).toEqual([{ to: "+254712345678", text: message.sms }]);
  });

  it("respects channel settings and missing details, and records failures", async () => {
    const { rec, notifier } = make();
    await register(owner.address, { notifyEmail: false, phone: null });
    await notifier.notify(owner.address, "a", messages.claimUnderReview({ id: "1" }));
    expect((await rowsFor(owner.address))[0]).toMatchObject({ email: "skipped", sms: "skipped" });

    await register(owner.address, { notifyEmail: true, phone: "+254712345678" });
    rec.fail.email = true;
    await notifier.notify(owner.address, "b", messages.claimUnderReview({ id: "2" }));
    const row = (await rowsFor(owner.address)).find((r) => r.key === "b");
    expect(row).toMatchObject({ email: "failed", sms: "sent" });
  });

  it("still records in-app notifications for wallets without a profile", async () => {
    const { rec, notifier } = make();
    await notifier.notify(stranger.address, "x", messages.claimPaid({ id: "1", payout: 1n }));
    expect((await rowsFor(stranger.address))[0]).toMatchObject({ email: "skipped", sms: "skipped" });
    expect(rec.sent.emails).toHaveLength(0);
  });

  it("tells only assessors about work, by email and never SMS", async () => {
    const { rec, notifier } = make();
    await notifier.notifyAssessors("claim-filed:9", messages.claimFiled({ id: "9", amount: 1_000_000_000n }));
    expect(await rowsFor(owner.address)).toHaveLength(0);
    expect((await rowsFor(assessor.address))[0]).toMatchObject({ kind: "claim-filed", link: "/assessor/claims/9", sms: "skipped" });
    expect(rec.sent.texts).toHaveLength(0);
  });
});

describe("worker", () => {
  const T = 1_800_000_000; // unix seconds
  const claim = (overrides: Partial<NonNullable<ClaimEventItem["claim"]>> = {}) => ({
    id: "4",
    claimant: owner.address.toLowerCase(),
    requestedAmount: "1400000000",
    payoutAmount: "550000000",
    rejectionReason: null,
    paidTo: null,
    ...overrides,
  });
  const policy = (overrides: Partial<PolicyItem> = {}): PolicyItem => ({
    id: "2",
    buyer: owner.address.toLowerCase(),
    holder: owner.address.toLowerCase(),
    startTime: String(T + 5),
    endTime: String(T + 365 * 86_400),
    cancelled: false,
    cancelledAt: null,
    refund: null,
    ...overrides,
  });

  function setup(feed: Partial<ActivityFeed>, startAt = T) {
    const rec = recorder();
    let clock = startAt * 1000;
    const notifier = createNotifier({ db, channels: rec.channels, appUrl: "https://app.example", isAssessor: async (a) => a === assessor.address, log: () => {} });
    const worker = notificationWorker({
      db,
      notifier,
      feed: { activity: async () => ({ claimEvents: [], policies: [] }), policiesEnding: async () => [], ...feed },
      now: () => new Date(clock),
      log: () => {},
    });
    return { rec, worker, advance: (seconds: number) => (clock += seconds * 1000) };
  }

  it("starts from now on its first run instead of replaying history", async () => {
    const activity = vi.fn(async () => ({ claimEvents: [{ claimId: "1", status: "Submitted" as const, timestamp: "1", claim: claim() }], policies: [] }));
    const { worker } = setup({ activity });
    await worker.runOnce();
    expect(activity).not.toHaveBeenCalled();
    expect(await rowsFor(owner.address)).toHaveLength(0);
  });

  it("turns claim and policy activity into notifications, once each", async () => {
    const events: ClaimEventItem[] = [
      { claimId: "4", status: "Submitted", timestamp: String(T + 1), claim: claim() },
      { claimId: "4", status: "UnderReview", timestamp: String(T + 2), claim: claim() },
      { claimId: "4", status: "Approved", timestamp: String(T + 3), claim: claim() },
      { claimId: "4", status: "Paid", timestamp: String(T + 4), claim: claim({ paidTo: owner.address.toLowerCase() }) },
    ];
    const activity = vi.fn(async () => ({ claimEvents: events, policies: [policy(), policy({ id: "3", startTime: String(T - 100), cancelled: true, cancelledAt: String(T + 6), refund: "387390000" })] }));
    const { worker } = setup({ activity });
    await worker.runOnce(); // sets the starting point
    await worker.runOnce();
    await worker.runOnce(); // same events again: no duplicates

    const kinds = (await rowsFor(owner.address)).map((r) => r.kind).sort();
    expect(kinds).toEqual(["claim-approved", "claim-paid", "claim-received", "claim-under-review", "policy-bought", "policy-cancelled"]);
    expect((await rowsFor(assessor.address)).map((r) => r.kind)).toEqual(["claim-filed"]);
    // It continues from the latest event it saw.
    expect(activity).toHaveBeenLastCalledWith(BigInt(T + 6));
  });

  it("sends renewal reminders at 30 and 7 days and when cover ends, at most hourly", async () => {
    const policiesEnding = vi.fn(async (after: bigint, before: bigint) => {
      const all = [
        policy({ id: "10", endTime: String(T + 20 * 86_400) }),
        policy({ id: "11", endTime: String(T + 3 * 86_400) }),
        policy({ id: "12", endTime: String(T - 3600) }),
      ];
      return all.filter((p) => BigInt(p.endTime) >= after && BigInt(p.endTime) < before);
    });
    const { worker, advance } = setup({ policiesEnding });
    await worker.runOnce();
    const keys = (await rowsFor(owner.address)).map((r) => r.key).sort();
    expect(keys).toEqual(["policy:10:renewal-30", "policy:11:renewal-7", "policy:12:expired"]);

    const calls = policiesEnding.mock.calls.length;
    advance(600);
    await worker.runOnce();
    expect(policiesEnding.mock.calls.length).toBe(calls); // not again within the hour
    advance(3600);
    await worker.runOnce();
    expect(policiesEnding.mock.calls.length).toBeGreaterThan(calls);
    expect(await rowsFor(owner.address)).toHaveLength(3); // and still no duplicates
  });
});

describe("API", () => {
  const NOW = new Date("2026-06-01T00:00:00Z");
  // Built once the test database is open (beforeAll above runs first).
  let notifier: ReturnType<typeof createNotifier>;
  let api: ReturnType<typeof createApp>;
  beforeAll(() => {
    notifier = createNotifier({ db, channels: recorder().channels, appUrl: "https://app.example", isAssessor: async (a) => a === assessor.address, log: () => {} });
    api = createApp({
      signer: Wallet.createRandom(),
      deployment: deployments.sepolia,
      vehicleIdSalt: "salt",
      verifier: databaseVerifier(db),
      db,
      sessionSecret: "test-session-secret-test-session-secret",
      siweDomain: "localhost:3000",
      store: memoryStore(),
      photoKey: randomBytes(32),
      isAssessor: async (address) => address === assessor.address,
      notifier,
      now: () => NOW,
      rateLimits: false, // this file fires many requests at one app
    });
  });

  async function signIn(account: PrivateKeyAccount) {
    const { nonce } = await (await api.request("/v1/auth/nonce")).json();
    const message = createSiweMessage({ address: account.address, chainId: deployments.sepolia.chainId, domain: "localhost:3000", nonce, uri: "http://localhost:3000", version: "1", issuedAt: NOW });
    const res = await api.request("/v1/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature: await account.signMessage({ message }) }),
    });
    return { Authorization: `Bearer ${(await res.json()).token}` };
  }
  const json = (headers: Record<string, string>) => ({ ...headers, "Content-Type": "application/json" });

  it("lists a wallet's notifications with the unread count, and marks them read", async () => {
    await notifier.notify(owner.address, "one", messages.claimUnderReview({ id: "1" }));
    await notifier.notify(owner.address, "two", messages.claimPaid({ id: "1", payout: 1n }));
    await notifier.notify(stranger.address, "other", messages.claimPaid({ id: "2", payout: 1n }));
    const auth = await signIn(owner);

    const list = await (await api.request("/v1/notifications", { headers: auth })).json();
    expect(list.unread).toBe(2);
    expect(list.notifications.map((n: { title: string }) => n.title)).toHaveLength(2);

    await api.request("/v1/notifications/read", { method: "POST", headers: json(auth), body: JSON.stringify({ ids: [list.notifications[0].id] }) });
    expect((await (await api.request("/v1/notifications", { headers: auth })).json()).unread).toBe(1);
    await api.request("/v1/notifications/read", { method: "POST", headers: json(auth), body: "{}" });
    expect((await (await api.request("/v1/notifications", { headers: auth })).json()).unread).toBe(0);
    expect((await rowsFor(stranger.address))[0].readAt).toBeNull();
    expect((await api.request("/v1/notifications")).status).toBe(401);
  });

  it("saves channel settings on the profile", async () => {
    const auth = await signIn(owner);
    const res = await api.request("/v1/profile", {
      method: "PUT",
      headers: json(auth),
      body: JSON.stringify({ fullName: "Test Person", email: "t@example.com", notifyEmail: false, notifySms: true }),
    });
    expect((await res.json()).profile).toMatchObject({ notifyEmail: false, notifySms: true });
  });

  it("tells assessors when a car is ready and owners when it's verified", async () => {
    const ownerAuth = await signIn(owner);
    const vehicle = await (
      await api.request("/v1/vehicles", {
        method: "POST",
        headers: json(ownerAuth),
        body: JSON.stringify({ plate: "NTF 001", make: "Mazda", model: "Demio", year: 2017, marketValueUsdc: 7000, mileageKm: 1, condition: 8, accidentsLast3Years: 0, usage: "private" }),
      })
    ).json();
    for (const view of PHOTO_VIEWS) {
      const form = new FormData();
      form.set("view", view);
      form.set("file", new File([new Uint8Array(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(200)]))], `${view}.jpg`));
      await api.request(`/v1/vehicles/${vehicle.id}/photos`, { method: "POST", headers: ownerAuth, body: form });
    }
    await vi.waitFor(async () => expect((await rowsFor(assessor.address)).map((r) => r.kind)).toContain("vehicle-ready"));

    await api.request(`/v1/assessor/vehicles/${vehicle.id}/verify`, { method: "POST", headers: json(await signIn(assessor)), body: "{}" });
    await vi.waitFor(async () =>
      expect((await rowsFor(owner.address)).find((r) => r.kind === "vehicle-verified")).toMatchObject({ link: `/dashboard/vehicles/${vehicle.id}/buy` }),
    );
  });
});
