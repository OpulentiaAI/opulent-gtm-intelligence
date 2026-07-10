// Offline test for attio-pp-cli. No network, no API key required.
// Verifies: arg parsing, compact output, mirror read/write, error paths, destructive confirm guards.

import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BIN = new URL("../dist/index.js", import.meta.url).pathname;
const TMP = join(tmpdir(), `attio-pp-test-${Date.now()}`);
mkdirSync(TMP, { recursive: true });

let pass = 0;
let fail = 0;

function run(args, env = {}) {
  try {
    const out = execFileSync("node", [BIN, ...args], {
      encoding: "utf8",
      env: { ...process.env, ...env },
      timeout: 10000,
    });
    return { ok: true, out, err: "" };
  } catch (e) {
    return { ok: false, out: e.stdout ?? "", err: e.stderr ?? e.message ?? "" };
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    pass++;
  } catch (e) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${e.message}`);
    fail++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? "assertion failed");
}

// 1. Help works
test("--help prints usage", () => {
  const r = run(["--help"]);
  assert(r.ok, "help should exit 0");
  assert(r.out.includes("attio-pp-cli"), "help should mention CLI name");
  assert(r.out.includes("setup-check"), "help should list setup-check");
  assert(r.out.includes("ensure-structure"), "help should list ensure-structure");
});

// 2. No API key -> error
test("list-objects without API key errors cleanly", () => {
  const r = run(["list-objects"], { ATTIO_API_KEY: "" });
  assert(!r.ok, "should fail without key");
  assert(r.err.includes("No Attio API key"), `err should mention missing key, got: ${r.err}`);
});

// 3. get-object without --object
test("get-object without --object errors", () => {
  const r = run(["get-object"], { ATTIO_API_KEY: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("requires --object"), `got: ${r.err}`);
});

// 4. find-record without --object
test("find-record without --object errors", () => {
  const r = run(["find-record"], { ATTIO_API_KEY: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("requires --object"), `got: ${r.err}`);
});

// 5. find-record without --record-id or --filter
test("find-record without --record-id or --filter errors", () => {
  const r = run(["find-record", "--object=companies"], { ATTIO_API_KEY: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("requires --record-id or --filter"), `got: ${r.err}`);
});

// 6. create-note missing fields
test("create-note missing fields errors", () => {
  const r = run(["create-note", "--parent-object=companies", "--parent-record-id=rec_1"], { ATTIO_API_KEY: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("requires --parent-object, --parent-record-id, --title, --content"), `got: ${r.err}`);
});

// 7. delete-record without --confirm
test("delete-record without --confirm errors", () => {
  const r = run(["delete-record", "--object=companies", "--record-id=rec_1"], { ATTIO_API_KEY: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("destructive"), `got: ${r.err}`);
});

// 8. delete-note without --confirm
test("delete-note without --confirm errors", () => {
  const r = run(["delete-note", "--note-id=note_1"], { ATTIO_API_KEY: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("destructive"), `got: ${r.err}`);
});

// 9. mirror-show with no mirror
test("mirror-show with missing mirror errors", () => {
  const r = run(["mirror-show", "--mirror-name=nonexistent-test-xyz"], { ATTIO_PP_MIRROR: TMP });
  assert(!r.ok, "should fail");
  assert(r.err.includes("No mirror found"), `got: ${r.err}`);
});

// 10. mirror-list on empty dir
test("mirror-list on empty dir", () => {
  const r = run(["mirror-list"], { ATTIO_PP_MIRROR: TMP });
  assert(r.ok, "should exit 0");
  assert(r.out.includes("files: [0]"), "should show 0 files");
});

// 11. mirror round-trip
test("mirror round-trip write+read", () => {
  const mirrorFile = join(TMP, "roundtrip.json");
  writeFileSync(mirrorFile, JSON.stringify({ test: "data", objects: [{ name: "companies" }] }));
  const r = run(["mirror-show", "--mirror-name=roundtrip"], { ATTIO_PP_MIRROR: TMP });
  assert(r.ok, "should exit 0");
  assert(r.out.includes("companies"), "should show object name");
});

// 12. mirror-list shows file
test("mirror-list shows file", () => {
  const r = run(["mirror-list"], { ATTIO_PP_MIRROR: TMP });
  assert(r.ok, "should exit 0");
  assert(r.out.includes("roundtrip.json"), "should list roundtrip.json");
});

// Cleanup
rmSync(TMP, { recursive: true, force: true });

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
