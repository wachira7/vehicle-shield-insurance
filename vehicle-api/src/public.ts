// Public, unauthenticated lookups behind the "is this car covered?" check: police, garages or a
// buyer can check a plate, or scan a policy's QR code. Only what that needs is shared: make,
// model, year and a masked plate. Whether cover is active comes from the chain, not from here.
//
// Anyone can turn a plate into its on-chain vehicle id through this endpoint, which is the
// point of a public check (as with insurers' own plate checks). Requests are rate limited per
// client to make bulk plate scraping slow.
import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { vehicleIdFor } from "@vehicle-shield/protocol";
import { schema, type Database } from "./db";
import { rateLimit as limitRequests } from "./rate-limit";

export interface PublicDeps {
  db: Database;
  vehicleIdSalt: string;
  now: () => Date;
  /// Requests allowed per client per minute.
  rateLimit?: number;
}

/// "KCX456B" -> "KCX•••B": enough to compare with the car in front of you, not to read off a list.
export function maskPlate(plate: string): string {
  if (plate.length <= 4) return `${plate[0]}${"•".repeat(Math.max(1, plate.length - 2))}${plate.at(-1)}`;
  return `${plate.slice(0, 3)}${"•".repeat(plate.length - 4)}${plate.at(-1)}`;
}

const plateSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9 -]{2,15}$/);

export function publicRoutes({ db, vehicleIdSalt, now, rateLimit = 30 }: PublicDeps) {
  const app = new Hono();
  app.use("*", limitRequests({ limit: rateLimit, now, reason: "Too many checks. Try again in a minute." }));

  async function verifiedVehicle(vehicleId: string) {
    const [vehicle] = await db
      .select({ make: schema.vehicles.make, model: schema.vehicles.model, year: schema.vehicles.year, plate: schema.vehicles.plate })
      .from(schema.vehicles)
      .where(and(sql`lower(${schema.vehicles.vehicleId}) = ${vehicleId.toLowerCase()}`, eq(schema.vehicles.status, "verified")));
    return vehicle ? { make: vehicle.make, model: vehicle.model, year: vehicle.year, plate: maskPlate(vehicle.plate) } : null;
  }

  /// A plate's on-chain vehicle id (to look its policies up on-chain or in the indexer), plus
  /// the verified car's description when there is one.
  app.get("/check", async (c) => {
    const plate = plateSchema.safeParse(c.req.query("plate"));
    if (!plate.success) return c.json({ error: "invalid_plate", reason: "Enter a number plate (letters, digits, spaces)" }, 400);
    const vehicleId = vehicleIdFor(plate.data, vehicleIdSalt);
    return c.json({ vehicleId, vehicle: await verifiedVehicle(vehicleId) });
  });

  /// The verified car behind an on-chain vehicle id, e.g. from a policy's QR code.
  app.get("/vehicles/:vehicleId", async (c) => {
    const vehicleId = c.req.param("vehicleId");
    if (!/^0x[0-9a-fA-F]{64}$/.test(vehicleId)) return c.json({ error: "invalid_vehicle_id" }, 400);
    const vehicle = await verifiedVehicle(vehicleId);
    return vehicle ? c.json(vehicle) : c.json({ error: "not_found" }, 404);
  });

  return app;
}
