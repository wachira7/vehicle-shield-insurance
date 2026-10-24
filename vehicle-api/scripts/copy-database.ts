// Copies the API's records from one database to another, e.g. from the local PGlite used in
// development to the hosted Postgres. Photos themselves live in Filebase, so copying their
// rows is enough. Rows already in the target are left alone, so it's safe to run again.
//
//   SOURCE_DATABASE_URL=pglite:./.data/pglite TARGET_DATABASE_URL=postgresql://... yarn copy-db
//
// Sign-in nonces aren't copied: they're short-lived.
import { openDatabase, schema } from "../src/db";

const { SOURCE_DATABASE_URL: source, TARGET_DATABASE_URL: target } = process.env;
if (!source || !target) throw new Error("Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL");
if (source === target) throw new Error("Source and target are the same database");

// Parents before children: photos point at vehicles and claim evidence.
const tables = [
  ["profiles", schema.profiles],
  ["vehicles", schema.vehicles],
  ["claim evidence", schema.claimEvidence],
  ["photos", schema.photos],
  ["notifications", schema.notifications],
  ["job state", schema.jobState],
] as const;

const from = await openDatabase(source);
const to = await openDatabase(target); // also applies migrations to the target
try {
  for (const [name, table] of tables) {
    const rows = await from.db.select().from(table);
    let copied = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- one loop over differently typed tables
      const inserted = await to.db.insert(table).values(batch as any).onConflictDoNothing().returning();
      copied += inserted.length;
    }
    console.log(`${name}: ${rows.length} in source, ${copied} copied, ${rows.length - copied} already there`);
  }
} finally {
  await from.close();
  await to.close();
}
