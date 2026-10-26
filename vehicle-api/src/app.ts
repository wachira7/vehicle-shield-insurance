import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { formatUnits, getAddress, isAddress, parseUnits, type BaseWallet } from "ethers";
import { z } from "zod";
import {
  createSignedQuote,
  priceQuote,
  quoteDomain,
  serializeQuote,
  vehicleIdFor,
  type Deployment,
  type PricingResult,
} from "@vehicle-shield/protocol";
import { STAFF_ACCOUNT, authRoutes, type SignatureCheck } from "./auth";
import type { Database } from "./db";
import { assessorRoutes } from "./assessor";
import { evidenceRoutes, photoRoutes, vehicleRoutes } from "./photos";
import { profileRoutes } from "./profile";
import { publicRoutes } from "./public";
import { rateLimit } from "./rate-limit";
import { notificationRoutes } from "./notifications/routes";
import type { Notifier } from "./notifications/notifier";
import type { PolicyReader, RoleCheck } from "./roles";
import type { BlobStore } from "./storage";
import type { VehicleVerifier } from "./verification";

export interface AppOptions {
  signer: BaseWallet;
  deployment: Deployment;
  vehicleIdSalt: string;
  verifier: VehicleVerifier;
  db: Database;
  sessionSecret: string;
  siweDomain: string;
  store: BlobStore;
  photoKey: Buffer;
  isAssessor: RoleCheck;
  /// Reads a policy from the chain; without it the assessor review can't match a claim to its car.
  readPolicy?: PolicyReader;
  /// Sends notifications for events the API sees itself (vehicle reviews, cars ready to verify).
  notifier?: Notifier;
  verifySignature?: SignatureCheck;
  corsOrigins?: string[];
  /// Per-client request limits (on by default; tests that fire many requests turn them off).
  rateLimits?: boolean;
  now?: () => Date;
}

const usdcAmount = z
  .union([z.number(), z.string()])
  .transform((value) => String(value))
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Use a positive amount with at most 2 decimal places")
  .transform((value) => parseUnits(value, 6));

const estimateRequest = z.object({
  vehicle: z.object({
    year: z.number().int().min(1950).max(2100),
    marketValueUsdc: usdcAmount,
    mileageKm: z.number().int().min(0),
    condition: z.number().int().min(1).max(10),
    accidentsLast3Years: z.number().int().min(0).max(20),
    usage: z.enum(["private", "commercial"]),
  }),
  coverageUsdc: usdcAmount,
  deductibleUsdc: usdcAmount,
  durationDays: z.number().int(),
});

const quoteRequest = estimateRequest.extend({
  buyer: z.string().refine((value) => isAddress(value), "Not a valid address").transform((value) => getAddress(value)),
  plate: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9 -]{2,15}$/, "Use 2 to 15 letters, digits, spaces or hyphens"),
});

const usdc = (amount: bigint) => formatUnits(amount, 6);

function describePrice(price: Extract<PricingResult, { eligible: true }>) {
  return {
    premiumUsdc: usdc(price.premium),
    annualPremiumUsdc: usdc(price.annualPremium),
    factors: price.factors.map((factor) => ({ ...factor, multiplier: factor.multiplierBps / 10_000 })),
    pricingVersion: price.pricingVersion,
  };
}

export function createApp({
  signer,
  deployment,
  vehicleIdSalt,
  verifier,
  db,
  sessionSecret,
  siweDomain,
  store,
  photoKey,
  isAssessor,
  readPolicy = async () => null,
  notifier,
  verifySignature,
  corsOrigins = [],
  rateLimits = true,
  now = () => new Date(),
}: AppOptions) {
  const app = new Hono();
  const domain = quoteDomain(deployment.chainId, deployment.contracts.InsuranceCore);

  // Standard protective headers. Cross-origin resource and embedder policies stay off: the web
  // app on another origin loads photos and data from here.
  app.use("*", secureHeaders({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(
    "/v1/*",
    cors({ origin: corsOrigins, allowMethods: ["GET", "POST", "PUT"], allowHeaders: ["Content-Type", "Authorization"] }),
  );

  // Per client, per minute: everything, then tighter limits for sign-in, writes and uploads.
  if (rateLimits) {
    app.use("/v1/*", rateLimit({ limit: 300, now }));
    app.use("/v1/auth/*", rateLimit({ limit: 20, now, reason: "Too many sign-in attempts. Try again in a minute." }));
    const writes = rateLimit({ limit: 60, now });
    const uploads = rateLimit({ limit: 30, now, reason: "Too many uploads. Try again in a minute." });
    app.use("/v1/*", async (c, next) => (["POST", "PUT", "DELETE"].includes(c.req.method) ? writes(c, next) : next()));
    app.use("/v1/vehicles/:id/photos", async (c, next) => (c.req.method === "POST" ? uploads(c, next) : next()));
    app.use("/v1/claims/evidence", async (c, next) => (c.req.method === "POST" ? uploads(c, next) : next()));
  }

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: "internal_error" }, 500);
  });

  app.get("/health", (c) =>
    c.json({
      ok: true,
      network: deployment.network,
      chainId: deployment.chainId,
      insuranceCore: deployment.contracts.InsuranceCore,
      quoteSigner: signer.address,
    }),
  );

  app.route("/v1/auth", authRoutes({ db, sessionSecret, siweDomain, chainId: deployment.chainId, now, verifySignature }));
  app.route("/v1/profile", profileRoutes({ db, sessionSecret, now }));
  app.route("/v1/notifications", notificationRoutes({ db, sessionSecret, now }));
  app.route("/v1/public", publicRoutes({ db, vehicleIdSalt, now }));
  const photoDeps = { db, store, photoKey, vehicleIdSalt, sessionSecret, now, isStaff: isAssessor, notifier };
  app.route("/v1/vehicles", vehicleRoutes(photoDeps));
  app.route("/v1/claims/evidence", evidenceRoutes(photoDeps));
  app.route("/v1/photos", photoRoutes(photoDeps));
  app.route("/v1/assessor", assessorRoutes({ ...photoDeps, isAssessor, readPolicy }));

  /// Instant price with no wallet: lets people compare cover before connecting.
  app.post("/v1/quotes/estimate", async (c) => {
    const parsed = estimateRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
    const { vehicle, ...request } = parsed.data;

    const price = priceQuote(
      { ...vehicle, marketValue: vehicle.marketValueUsdc },
      { coverage: request.coverageUsdc, deductible: request.deductibleUsdc, durationDays: request.durationDays },
      now(),
    );
    if (!price.eligible) return c.json({ error: "not_eligible", reasons: price.reasons }, 422);
    return c.json(describePrice(price));
  });

  /// Signed quote the buyer submits to InsuranceCore.buyPolicy.
  app.post("/v1/quotes", async (c) => {
    const parsed = quoteRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid_request", issues: parsed.error.issues }, 400);
    const { vehicle, buyer, plate, ...request } = parsed.data;
    // No signed price, no policy: this is what keeps assessor wallets from buying cover.
    if (await isAssessor(buyer as `0x${string}`)) return c.json(STAFF_ACCOUNT, 403);

    const vehicleId = vehicleIdFor(plate, vehicleIdSalt);
    const verification = await verifier.check(vehicleId, buyer);
    if (!verification.approved) return c.json({ error: "vehicle_not_verified", vehicleId }, 403);

    // A verified vehicle is priced from its assessor-confirmed details, not the request's.
    const price = priceQuote(
      verification.profile ?? { ...vehicle, marketValue: vehicle.marketValueUsdc },
      { coverage: request.coverageUsdc, deductible: request.deductibleUsdc, durationDays: request.durationDays },
      now(),
    );
    if (!price.eligible) return c.json({ error: "not_eligible", reasons: price.reasons }, 422);

    const { quote, signature } = await createSignedQuote(
      signer,
      domain,
      {
        buyer,
        vehicleId,
        coverage: request.coverageUsdc,
        premium: price.premium,
        deductible: request.deductibleUsdc,
        durationDays: request.durationDays,
      },
      { nowSeconds: Math.floor(now().getTime() / 1000) },
    );

    return c.json({
      quote: serializeQuote(quote),
      signature,
      expiresAt: new Date(Number(quote.deadline) * 1000).toISOString(),
      contract: { chainId: deployment.chainId, insuranceCore: deployment.contracts.InsuranceCore, usdc: deployment.contracts.USDC },
      pricedFrom: verification.profile ? "verified_vehicle" : "request",
      ...describePrice(price),
    });
  });

  return app;
}
