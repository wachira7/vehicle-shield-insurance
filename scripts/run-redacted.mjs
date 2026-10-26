#!/usr/bin/env node
// Runs a command and passes its output through, line by line, with secrets masked (see
// redact.mjs). Hosting providers keep logs, and libraries print RPC URLs, which carry API
// keys, in their errors. Exit codes and stop signals are forwarded.
//
//   node scripts/run-redacted.mjs <command> [args...]
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { redact } from "./redact.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: run-redacted.mjs <command> [args...]");
  process.exit(2);
}

const child = spawn(command, args, { stdio: ["inherit", "pipe", "pipe"] });
for (const [from, to] of [
  [child.stdout, process.stdout],
  [child.stderr, process.stderr],
]) {
  createInterface({ input: from, crlfDelay: Infinity }).on("line", (line) => to.write(`${redact(line)}\n`));
}
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error(redact(String(error)));
  process.exit(1);
});
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
