import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { vehicleIdFor } from "@vehicle-shield/protocol";
import { openDatabase, schema, type Database } from "../src/db";
import { maskPlate, publicRoutes } from "../src/public";

let db: Database;
let closeDb: () => Promise<void>;
beforeAll(async () => {
  ({ db, close: closeDb } = await openDatabase("pglite:"));
  const base = { make: "Toyota", model: "Yaris", year: 2016, marketValue: 9_000_000_000n, mileageKm: 1, condition: 7, accidentsLast3Years: 0, usage: "private" as const };
  await db.insert(schema.vehicles).values([
    { ...base, owner: "0xA", plate: "KCX456B", vehicleId: vehicleIdFor("KCX456B", "salt"), status: "verified" },
    { ...base, owner: "0xB", plate: "KDD111A", vehicleId: vehicleIdFor("KDD111A", "salt"), status: "pending" },
  ]);
});
afterAll(() => closeDb());

const api = (rateLimit = 30, now = () => new Date("2026-06-01T00:00:00Z")) =>
  new Hono().route("/v1/public", publicRoutes({ db, vehicleIdSalt: "salt", now, rateLimit }));

describe("public cover check", () => {
  it("turns a plate, however it's typed, into its vehicle id and the verified car", async () => {
    const res = await api().request("/v1/public/check?plate=kcx%20456b");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      vehicleId: vehicleIdFor("KCX456B", "salt"),
      vehicle: { make: "Toyota", model: "Yaris", year: 2016, plate: "KCX•••B" },
    });
  });

  it("shares nothing about unverified or unknown cars beyond the id", async () => {
    const pending = await (await api().request("/v1/public/check?plate=KDD111A")).json();
    expect(pending.vehicle).toBeNull();
    const unknown = await (await api().request("/v1/public/check?plate=XYZ999")).json();
    expect(unknown).toEqual({ vehicleId: vehicleIdFor("XYZ999", "salt"), vehicle: null });
    expect((await api().request("/v1/public/check?plate=%3Cscript%3E")).status).toBe(400);
  });

  it("describes the car behind a policy's vehicle id", async () => {
    const id = vehicleIdFor("KCX456B", "salt");
    expect(await (await api().request(`/v1/public/vehicles/${id}`)).json()).toMatchObject({ plate: "KCX•••B", model: "Yaris" });
    expect((await api().request(`/v1/public/vehicles/${vehicleIdFor("KDD111A", "salt")}`)).status).toBe(404);
    expect((await api().request("/v1/public/vehicles/0x1234")).status).toBe(400);
  });

  it("rate limits each client", async () => {
    const limited = api(2);
    const as = (ip: string) => ({ headers: { "x-forwarded-for": ip } });
    expect((await limited.request("/v1/public/check?plate=A1", as("1.1.1.1"))).status).toBe(200);
    expect((await limited.request("/v1/public/check?plate=A1", as("1.1.1.1"))).status).toBe(200);
    const third = await limited.request("/v1/public/check?plate=A1", as("1.1.1.1"));
    expect(third.status).toBe(429);
    expect(third.headers.get("retry-after")).toBe("60");
    expect((await limited.request("/v1/public/check?plate=A1", as("2.2.2.2"))).status).toBe(200);
  });
});

describe("maskPlate", () => {
  it("keeps the start and end", () => {
    expect(maskPlate("KCX456B")).toBe("KCX•••B");
    expect(maskPlate("KDA1")).toBe("K••1");
    expect(maskPlate("AB")).toBe("A•B");
  });
});
