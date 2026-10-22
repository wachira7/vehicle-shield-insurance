import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/// Single-use Sign-In with Ethereum nonces. A nonce is deleted when it is used.
export const authNonces = pgTable("auth_nonce", {
  nonce: text("nonce").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
