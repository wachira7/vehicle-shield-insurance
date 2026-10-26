import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { redact } from "./redact.mjs";

test("masks RPC keys in URL paths", () => {
  assert.equal(
    redact("URL: https://eth-sepolia.g.alchemy.com/v2/FAKEkeyFORtests0000000 failed"),
    "URL: https://eth-sepolia.g.alchemy.com/v2/*** failed",
  );
  assert.equal(redact("https://rpc.example.test/v3/FAKEkeyFORtests11111"), "https://rpc.example.test/v3/***");
});

test("masks key-like query parameters, database passwords and bearer tokens", () => {
  assert.equal(redact("https://rpc.example.test/?apikey=FAKE_FOR_TESTS&chain=1"), "https://rpc.example.test/?apikey=***&chain=1");
  assert.equal(
    redact("postgresql://example_user:not-a-real-password@db.example.test/app"),
    "postgresql://example_user:***@db.example.test/app",
  );
  assert.equal(redact("Authorization: Bearer FAKE.token.for-tests"), "Authorization: Bearer ***");
});

test("leaves ordinary log lines, addresses and transaction hashes alone", () => {
  const line = "claim 4 approved in 0x02a2672031ff6f5a9584bdab4b8df7945cf9c3f13ce92fb54adabe1985776488 by 0x44b638E43c1EC2134E3103A2aa7ed74E473130AC";
  assert.equal(redact(line), line);
  assert.equal(redact("GET /v1/policies/2 200"), "GET /v1/policies/2 200");
});

test("run-redacted passes output through masked and keeps the exit code", () => {
  const script = fileURLToPath(new URL("./run-redacted.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [script, process.execPath, "-e", "console.log('rpc https://rpc.example.test/v2/FAKEkeyFORtests'); console.error('db postgres://u:pw@h/db'); process.exit(3)"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 3);
  assert.equal(result.stdout, "rpc https://rpc.example.test/v2/***\n");
  assert.equal(result.stderr, "db postgres://u:***@h/db\n");
});
