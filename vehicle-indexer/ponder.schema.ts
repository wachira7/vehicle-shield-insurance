import { index, onchainEnum, onchainTable, relations } from "ponder";

export const claimStatus = onchainEnum("claim_status", ["Submitted", "UnderReview", "Approved", "Rejected", "Paid"]);

// Amounts are USDC base units (6 decimals); times are unix seconds.
export const policy = onchainTable(
  "policy",
  (t) => ({
    id: t.bigint().primaryKey(),
    buyer: t.hex().notNull(),
    holder: t.hex().notNull(), // receives payouts; follows PolicyNFT transfers
    vehicleId: t.hex().notNull(),
    coverage: t.bigint().notNull(),
    premium: t.bigint().notNull(),
    deductible: t.bigint().notNull(),
    paidOut: t.bigint().notNull(),
    startTime: t.bigint().notNull(),
    endTime: t.bigint().notNull(),
    cancelled: t.boolean().notNull(),
    cancelledAt: t.bigint(),
    refund: t.bigint(),
    purchaseTx: t.hex().notNull(),
  }),
  (table) => ({
    holderIdx: index().on(table.holder),
    vehicleIdx: index().on(table.vehicleId),
  }),
);

export const claim = onchainTable(
  "claim",
  (t) => ({
    id: t.bigint().primaryKey(),
    policyId: t.bigint().notNull(),
    claimant: t.hex().notNull(),
    requestedAmount: t.bigint().notNull(),
    approvedAmount: t.bigint(),
    payoutAmount: t.bigint(),
    evidenceUri: t.text().notNull(),
    status: claimStatus("status").notNull(),
    rejectionReason: t.text(),
    paidTo: t.hex(),
    submittedAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
  }),
  (table) => ({ policyIdx: index().on(table.policyId) }),
);

/// One row per status change: the claim's timeline.
export const claimEvent = onchainTable(
  "claim_event",
  (t) => ({
    id: t.text().primaryKey(), // `${txHash}-${logIndex}`
    claimId: t.bigint().notNull(),
    status: claimStatus("status").notNull(),
    timestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({ claimIdx: index().on(table.claimId) }),
);

/// Single row ("global") of running totals for the transparency page.
export const poolStats = onchainTable("pool_stats", (t) => ({
  id: t.text().primaryKey(),
  policiesSold: t.integer().notNull(),
  policiesCancelled: t.integer().notNull(),
  premiumsCollected: t.bigint().notNull(),
  refundsPaid: t.bigint().notNull(),
  claimsSubmitted: t.integer().notNull(),
  claimsApproved: t.integer().notNull(),
  claimsRejected: t.integer().notNull(),
  claimsPaid: t.integer().notNull(),
  payoutsTotal: t.bigint().notNull(),
  poolFunded: t.bigint().notNull(),
  poolWithdrawn: t.bigint().notNull(),
}));

export const policyRelations = relations(policy, ({ many }) => ({ claims: many(claim) }));
export const claimRelations = relations(claim, ({ one, many }) => ({
  policy: one(policy, { fields: [claim.policyId], references: [policy.id] }),
  events: many(claimEvent),
}));
export const claimEventRelations = relations(claimEvent, ({ one }) => ({
  claim: one(claim, { fields: [claimEvent.claimId], references: [claim.id] }),
}));
