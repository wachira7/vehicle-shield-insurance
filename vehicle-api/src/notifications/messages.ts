// What each notification says. One function per event, giving the in-app title and body, a
// link into the app, and the SMS text (kept under 160 characters so it's one message). The
// email is built from the same title, body and link.

export interface Message {
  kind: string;
  title: string;
  body: string;
  link?: string;
  /// Omitted for notices that don't warrant a text message (e.g. staff work queues).
  sms?: string;
}

/// "$1,250.00" from USDC base units (6 decimals).
export function usd(units: bigint | string | number): string {
  return `$${(Number(units) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const day = (seconds: bigint | string | number) =>
  new Date(Number(seconds) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const sms = (text: string) => (text.length <= 160 ? text : `${text.slice(0, 157)}...`);

export const messages = {
  vehicleVerified: (v: { id: string; plate: string; make: string; model: string }): Message => ({
    kind: "vehicle-verified",
    title: `Your ${v.make} ${v.model} is verified`,
    body: `${v.plate} passed the assessor's check. You can now buy cover, priced from the confirmed details.`,
    link: `/dashboard/vehicles/${v.id}/buy`,
    sms: sms(`VehicleShield: ${v.plate} is verified. You can now buy cover in the app.`),
  }),

  vehicleSentBack: (v: { id: string; plate: string; note: string }): Message => ({
    kind: "vehicle-sent-back",
    title: `${v.plate} needs a change`,
    body: `The assessor asked for: ${v.note}`,
    link: `/dashboard/vehicles/${v.id}`,
    sms: sms(`VehicleShield: ${v.plate} needs a change before it can be verified. Details in the app.`),
  }),

  vehicleReady: (v: { id: string; plate: string; make: string; model: string }): Message => ({
    kind: "vehicle-ready",
    title: `${v.plate} is ready to verify`,
    body: `A ${v.make} ${v.model} has all six photos in and is waiting in the queue.`,
    link: `/assessor/vehicles/${v.id}`,
  }),

  claimFiled: (c: { id: string; amount: bigint | string }): Message => ({
    kind: "claim-filed",
    title: `New claim #${c.id} for ${usd(c.amount)}`,
    body: "Its photos have been checked and it's waiting in the queue.",
    link: `/assessor/claims/${c.id}`,
  }),

  claimReceived: (c: { id: string; amount: bigint | string }): Message => ({
    kind: "claim-received",
    title: `Claim #${c.id} received`,
    body: `Your claim for ${usd(c.amount)} is in. An assessor will review it, and we'll tell you at each step.`,
    link: `/dashboard/claims/${c.id}`,
    sms: sms(`VehicleShield: claim #${c.id} for ${usd(c.amount)} received. We'll text you when it moves.`),
  }),

  claimUnderReview: (c: { id: string }): Message => ({
    kind: "claim-under-review",
    title: `Claim #${c.id} is under review`,
    body: "An assessor is checking your photos against your policy.",
    link: `/dashboard/claims/${c.id}`,
    sms: sms(`VehicleShield: an assessor is now reviewing claim #${c.id}.`),
  }),

  claimApproved: (c: { id: string; payout: bigint | string }): Message => ({
    kind: "claim-approved",
    title: `Claim #${c.id} approved: ${usd(c.payout)} for you`,
    body: "Open the claim to collect your payout. It goes straight to your wallet.",
    link: `/dashboard/claims/${c.id}`,
    sms: sms(`VehicleShield: claim #${c.id} approved. ${usd(c.payout)} is ready to collect in the app.`),
  }),

  claimDeclined: (c: { id: string; reason: string | null }): Message => ({
    kind: "claim-declined",
    title: `Claim #${c.id} was declined`,
    body: c.reason ? `The assessor's reason: ${c.reason}` : "Open the claim to see the assessor's reason.",
    link: `/dashboard/claims/${c.id}`,
    sms: sms(`VehicleShield: claim #${c.id} was declined. The reason is in the app.`),
  }),

  claimPaid: (c: { id: string; payout: bigint | string }): Message => ({
    kind: "claim-paid",
    title: `${usd(c.payout)} paid for claim #${c.id}`,
    body: "The payout is in your wallet.",
    link: `/dashboard/claims/${c.id}`,
    sms: sms(`VehicleShield: ${usd(c.payout)} for claim #${c.id} is in your wallet.`),
  }),

  policyBought: (p: { id: string; endTime: bigint | string }): Message => ({
    kind: "policy-bought",
    title: `You're covered: policy #${p.id}`,
    body: `Your cover runs until ${day(p.endTime)}. Your proof of cover and its QR code are on the policy page.`,
    link: `/dashboard/policies/${p.id}`,
    sms: sms(`VehicleShield: you're covered until ${day(p.endTime)} (policy #${p.id}).`),
  }),

  policyCancelled: (p: { id: string; refund: bigint | string | null }): Message => ({
    kind: "policy-cancelled",
    title: `Policy #${p.id} cancelled`,
    body: p.refund ? `${usd(p.refund)} was refunded to your wallet.` : "Your cover has ended.",
    link: `/dashboard/policies/${p.id}`,
    sms: sms(`VehicleShield: policy #${p.id} is cancelled.${p.refund ? ` ${usd(p.refund)} refunded.` : ""}`),
  }),

  renewalDue: (p: { id: string; endTime: bigint | string; days: number }): Message => ({
    kind: `renewal-${p.days <= 7 ? "7" : "30"}`,
    title: `Your cover ends in ${p.days} day${p.days === 1 ? "" : "s"}`,
    body: `Policy #${p.id} ends on ${day(p.endTime)}. Renew from that day to stay covered; your terms will be ready.`,
    link: `/dashboard/policies/${p.id}`,
    sms: sms(`VehicleShield: your cover (policy #${p.id}) ends on ${day(p.endTime)}. Renew in the app to stay covered.`),
  }),

  policyExpired: (p: { id: string }): Message => ({
    kind: "policy-expired",
    title: "Your cover has ended",
    body: `Policy #${p.id} has expired, so your car isn't covered. Renew with the same terms in a minute.`,
    link: `/dashboard/policies/${p.id}`,
    sms: sms(`VehicleShield: policy #${p.id} has ended and your car isn't covered. Renew in the app.`),
  }),
};
