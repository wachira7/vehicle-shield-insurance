import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { openDatabase, schema } from "../src/db";

const root = mkdtempSync(path.join(tmpdir(), "vehicle-api-db-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("openDatabase", () => {
  it("creates an on-disk database in a folder that doesn't exist yet, and keeps its data", async () => {
    const url = `pglite:${path.join(root, "nested", "pglite")}`;
    const first = await openDatabase(url);
    await first.db.insert(schema.authNonces).values({ nonce: "persisted", expiresAt: new Date() });
    await first.close();

    const second = await openDatabase(url); // migrations run again without error
    const rows = await second.db.select().from(schema.authNonces);
    expect(rows.map((row) => row.nonce)).toEqual(["persisted"]);
    await second.close();
  }, 30_000); // creating a new on-disk database takes a few seconds
});
