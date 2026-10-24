import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each test file starts its own embedded Postgres (PGlite); on a busy machine or CI runner
    // that can take longer than the 10 s default, which would skip the whole file.
    hookTimeout: 60_000,
  },
});
