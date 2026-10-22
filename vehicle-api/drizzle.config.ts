import { defineConfig } from "drizzle-kit";

// `yarn db:generate` writes a SQL migration to ./drizzle after schema changes.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
