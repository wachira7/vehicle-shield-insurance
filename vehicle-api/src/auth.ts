// Sign-In with Ethereum (EIP-4361). The wallet signs a message naming our domain, chain and
// a single-use nonce; in return the API issues a short-lived session token (HS256 JWT) that
// clients send as `Authorization: Bearer <token>`.
import { Hono, type MiddlewareHandler } from "hono";
import { sign, verify } from "hono/jwt";
import { and, eq, gt, lt } from "drizzle-orm";
import { getAddress, verifyMessage, type Hex } from "viem";
import { generateSiweNonce, parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { z } from "zod";
import { schema, type Database } from "./db";

const NONCE_TTL_MS = 10 * 60 * 1000;
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

export type SignatureCheck = (args: { address: `0x${string}`; message: string; signature: Hex }) => Promise<boolean>;

/// Plain wallet (EOA) signatures only, checked locally.
export const eoaSignatureCheck: SignatureCheck = (args) => verifyMessage(args).catch(() => false);

export interface AuthOptions {
  db: Database;
  sessionSecret: string;
  siweDomain: string; // host the frontend is served from, e.g. "app.vehicleshield.xyz"
  chainId: number;
  now: () => Date;
  // Smart-contract wallets (social-login and other smart accounts) need an RPC-backed check.
  verifySignature?: SignatureCheck;
}

export type AuthEnv = { Variables: { address: `0x${string}` } };

const verifyRequest = z.object({
  message: z.string().min(1).max(4_000),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

const unauthorized = (reason: string) => ({ error: "unauthorized", reason });

export function authRoutes({ db, sessionSecret, siweDomain, chainId, now, verifySignature = eoaSignatureCheck }: AuthOptions) {
  const app = new Hono();

  app.get("/nonce", async (c) => {
    const nonce = generateSiweNonce();
    await db.insert(schema.authNonces).values({ nonce, expiresAt: new Date(now().getTime() + NONCE_TTL_MS) });
    // Expired nonces are never usable; clear them out as we go.
    await db.delete(schema.authNonces).where(lt(schema.authNonces.expiresAt, now()));
    return c.json({ nonce });
  });

  app.post("/verify", async (c) => {
    const parsed = verifyRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
    const { message, signature } = parsed.data;

    const fields = parseSiweMessage(message);
    if (!fields.address || !fields.nonce) return c.json(unauthorized("malformed_message"), 401);
    if (fields.chainId !== chainId) return c.json(unauthorized("wrong_chain"), 401);
    if (!validateSiweMessage({ message: fields, domain: siweDomain, time: now() })) {
      return c.json(unauthorized("invalid_message"), 401);
    }

    // Consume the nonce whether or not the signature checks out, so it can't be retried.
    const [used] = await db
      .delete(schema.authNonces)
      .where(and(eq(schema.authNonces.nonce, fields.nonce), gt(schema.authNonces.expiresAt, now())))
      .returning();
    if (!used) return c.json(unauthorized("unknown_or_expired_nonce"), 401);

    const valid = await verifySignature({ address: fields.address, message, signature: signature as Hex }).catch(() => false);
    if (!valid) return c.json(unauthorized("bad_signature"), 401);

    const address = getAddress(fields.address);
    const issuedAt = Math.floor(now().getTime() / 1000);
    const token = await sign({ sub: address, iat: issuedAt, exp: issuedAt + SESSION_TTL_SECONDS }, sessionSecret, "HS256");
    return c.json({ token, address, expiresAt: new Date((issuedAt + SESSION_TTL_SECONDS) * 1000).toISOString() });
  });

  app.get("/me", requireAuth(sessionSecret, now), (c) => c.json({ address: c.get("address") }));

  return app;
}

/// Rejects requests without a valid session token and exposes the signed-in address.
export function requireAuth(sessionSecret: string, now: () => Date): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const header = c.req.header("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    if (!token) return c.json(unauthorized("missing_token"), 401);
    try {
      // Check the signature here and the time claims below, against the app's clock.
      const payload = await verify(token, sessionSecret, { alg: "HS256", exp: false, iat: false, nbf: false });
      if (typeof payload.exp !== "number" || payload.exp * 1000 <= now().getTime()) {
        return c.json(unauthorized("expired_token"), 401);
      }
      c.set("address", getAddress(String(payload.sub)));
    } catch {
      return c.json(unauthorized("invalid_token"), 401);
    }
    await next();
  };
}
