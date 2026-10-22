import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "./schema";

export { schema };
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

/// Opens the database and applies pending migrations.
/// `pglite:` uses embedded Postgres (in memory, or `pglite:<dir>` on disk) for development
/// and tests; anything else is a Postgres connection string.
export async function openDatabase(url: string): Promise<{ db: Database; close: () => Promise<void> }> {
  if (url.startsWith("pglite:")) {
    const dir = url.slice("pglite:".length);
    if (dir) mkdirSync(dir, { recursive: true }); // PGlite won't create missing parents
    const client = new PGlite(dir || undefined);
    const db = drizzlePglite(client, { schema });
    await migratePglite(db, { migrationsFolder });
    return { db: db as unknown as Database, close: () => client.close() };
  }
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzlePg(pool, { schema });
  await migratePg(db, { migrationsFolder });
  return { db: db as unknown as Database, close: () => pool.end() };
}
