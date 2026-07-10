// Offline test for email-pp-cli. No network, no token required.

import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BIN = new URL("../dist/index.js", import.meta.url).pathname;
const TMP = join(tmpdir(), `email-pp-test-${Date.now()}`);
mkdirSync(TMP, { recursive: true });

let pass = 0, fail = 0;

function run(args, env = {}) {
  try {
    const out = execFileSync("node", [BIN, ...args], { encoding: "utf8", env: { ...process.env, ...env }, timeout: 10000 });
    return { ok: true, out, err: "" };
  } catch (e) {
    return { ok: false, out: e.stdout ?? "", err: e.stderr ?? e.message ?? "" };
  }
}

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); pass++; }
  catch (e) { console.error(`  FAIL: ${name}\n    ${e.message}`); fail++; }
}

function assert(cond, msg) { if (!cond) throw new Error(msg ?? "assertion failed"); }

test("--help prints usage", () => {
  const r = run(["--help"]);
  assert(r.ok, "help should exit 0");
  assert(r.out.includes("email-pp-cli"), "should mention CLI name");
  assert(r.out.includes("run-update-email"), "should list run-update-email");
});

test("send without token errors cleanly", () => {
  const r = run(["send", "--from=a@b.com", "--to=c@d.com", "--subject=Test", "--body=Hi"], { GMAIL_ACCESS_TOKEN: "" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("No Gmail access token"), `got: ${r.err}`);
});

test("send without --from errors", () => {
  const r = run(["send", "--to=c@d.com", "--subject=Test", "--body=Hi"], { GMAIL_ACCESS_TOKEN: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("requires --from"), `got: ${r.err}`);
});

test("send without --body errors", () => {
  const r = run(["send", "--from=a@b.com", "--to=c@d.com", "--subject=Test"], { GMAIL_ACCESS_TOKEN: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("requires --body"), `got: ${r.err}`);
});

test("draft-delete without --confirm errors", () => {
  const r = run(["draft-delete", "--id=d1"], { GMAIL_ACCESS_TOKEN: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("destructive"), `got: ${r.err}`);
});

test("run-update-email without --from/--to errors", () => {
  const r = run(["run-update-email"], { GMAIL_ACCESS_TOKEN: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("requires --from and --to"), `got: ${r.err}`);
});

test("mirror-show with missing mirror errors", () => {
  const r = run(["mirror-show", "--mirror-name=nonexistent"], { EMAIL_PP_MIRROR: TMP });
  assert(!r.ok, "should fail");
  assert(r.err.includes("No mirror found"), `got: ${r.err}`);
});

test("mirror-list on empty dir", () => {
  const r = run(["mirror-list"], { EMAIL_PP_MIRROR: TMP });
  assert(r.ok, "should exit 0");
  assert(r.out.includes("files: [0]"), "should show 0 files");
});

test("mirror round-trip write+read", () => {
  writeFileSync(join(TMP, "roundtrip.json"), JSON.stringify({ test: "data", sent: true }));
  const r = run(["mirror-show", "--mirror-name=roundtrip"], { EMAIL_PP_MIRROR: TMP });
  assert(r.ok, "should exit 0");
  assert(r.out.includes("sent: true"), "should show sent field");
});

rmSync(TMP, { recursive: true, force: true });
console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
