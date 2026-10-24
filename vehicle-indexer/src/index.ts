import { ponder, type Context } from "ponder:registry";
import { claim, claimEvent, policy, poolStats } from "ponder:schema";
import { EMPTY_TOTALS, addTotals, claimStatusName, type PoolTotals } from "./lib";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function bumpStats(db: Context["db"], delta: Partial<PoolTotals>) {
  await db
    .insert(poolStats)
    .values({ id: "global", ...addTotals(EMPTY_TOTALS, delta) })
    .onConflictDoUpdate((row) => addTotals(row, delta));
}

ponder.on("InsuranceCore:PolicyPurchased", async ({ event, context }) => {
  const { policyId, buyer, vehicleId, coverage, premium, deductible, startTime, endTime } = event.args;
  await context.db.insert(policy).values({
    id: policyId,
    buyer,
    holder: buyer,
    vehicleId,
    coverage,
    premium,
    deductible,
    paidOut: 0n,
    startTime,
    endTime,
    cancelled: false,
    purchaseTx: event.transaction.hash,
  });
  await bumpStats(context.db, { policiesSold: 1, premiumsCollected: premium });
});

ponder.on("InsuranceCore:PolicyCancelled", async ({ event, context }) => {
  const { policyId, refund } = event.args;
  await context.db
    .update(policy, { id: policyId })
    .set({ cancelled: true, cancelledAt: event.block.timestamp, refund });
  await bumpStats(context.db, { policiesCancelled: 1, refundsPaid: refund });
});

// The NFT is minted before PolicyPurchased is emitted and burned on cancellation, both of
// which the InsuranceCore handlers cover; only holder-to-holder transfers matter here.
ponder.on("PolicyNFT:Transfer", async ({ event, context }) => {
  const { from, to, tokenId } = event.args;
  if (from === ZERO_ADDRESS || to === ZERO_ADDRESS) return;
  await context.db.update(policy, { id: tokenId }).set({ holder: to });
});

ponder.on("InsuranceCore:ClaimSubmitted", async ({ event, context }) => {
  const { claimId, policyId, claimant, amount, evidenceURI } = event.args;
  await context.db.insert(claim).values({
    id: claimId,
    policyId,
    claimant,
    requestedAmount: amount,
    evidenceUri: evidenceURI,
    status: "Submitted",
    submittedAt: event.block.timestamp,
    updatedAt: event.block.timestamp,
  });
  await bumpStats(context.db, { claimsSubmitted: 1 });
});

ponder.on("InsuranceCore:ClaimStatusChanged", async ({ event, context }) => {
  const { claimId, status, timestamp } = event.args;
  const name = claimStatusName(Number(status));
  await context.db.update(claim, { id: claimId }).set({ status: name, updatedAt: timestamp });
  await context.db.insert(claimEvent).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    claimId,
    status: name,
    timestamp,
    txHash: event.transaction.hash,
    actor: event.transaction.from,
  });
});

ponder.on("InsuranceCore:ClaimApproved", async ({ event, context }) => {
  const { claimId, approvedAmount, payoutAmount } = event.args;
  await context.db.update(claim, { id: claimId }).set({ approvedAmount, payoutAmount });
  await bumpStats(context.db, { claimsApproved: 1 });
});

ponder.on("InsuranceCore:ClaimRejected", async ({ event, context }) => {
  const { claimId, reason } = event.args;
  await context.db.update(claim, { id: claimId }).set({ rejectionReason: reason });
  await bumpStats(context.db, { claimsRejected: 1 });
});

ponder.on("InsuranceCore:ClaimPaid", async ({ event, context }) => {
  const { claimId, recipient, amount } = event.args;
  const paid = await context.db.update(claim, { id: claimId }).set({ paidTo: recipient });
  await context.db.update(policy, { id: paid.policyId }).set((row) => ({ paidOut: row.paidOut + amount }));
  await bumpStats(context.db, { claimsPaid: 1, payoutsTotal: amount });
});

ponder.on("InsuranceCore:PoolFunded", async ({ event, context }) => {
  await bumpStats(context.db, { poolFunded: event.args.amount });
});

ponder.on("InsuranceCore:PoolWithdrawn", async ({ event, context }) => {
  await bumpStats(context.db, { poolWithdrawn: event.args.amount });
});
