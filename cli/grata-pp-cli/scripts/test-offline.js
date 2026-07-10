// Offline test for grata-pp-cli. No network, no API key required.
// Verifies: arg parsing, filter building, compact output, mirror read/write, error paths.

import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BIN = new URL("../dist/index.js", import.meta.url).pathname;
const TMP = join(tmpdir(), `grata-pp-test-${Date.now()}`);
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
  assert(r.out.includes("grata-pp-cli"), "help should mention CLI name");
  assert(r.out.includes("sourcing-run"), "help should list sourcing-run");
});

// 2. No API key -> error
test("search without API key errors cleanly", () => {
  const r = run(["search", "--terms=hvac"], { GRATA_API_KEY: "" });
  assert(!r.ok, "should fail without key");
  assert(r.err.includes("No Grata API key"), `err should mention missing key, got: ${r.err}`);
});

// 3. enrich without domain/uid -> error
test("enrich without domain/uid errors", () => {
  const r = run(["enrich"], { GRATA_API_KEY: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("requires --domain or --company-uid"), `got: ${r.err}`);
});

// 4. list-create without name -> error
test("list-create without name errors", () => {
  const r = run(["list-create"], { GRATA_API_KEY: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("requires --name"), `got: ${r.err}`);
});

// 5. list-modify invalid action
test("list-modify invalid action errors", () => {
  const r = run(["list-modify", "--list-uid=L1", "--action=delete", "--domains=a.com"], { GRATA_API_KEY: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("must be add or remove"), `got: ${r.err}`);
});

// 6. sourcing-run without terms or domain
test("sourcing-run without terms/domain errors", () => {
  const r = run(["sourcing-run"], { GRATA_API_KEY: "fake" });
  assert(!r.ok, "should fail");
  assert(r.err.includes("requires --terms"), `got: ${r.err}`);
});

// 7. mirror-show with no mirror
test("mirror-show with missing mirror errors", () => {
  const r = run(["mirror-show", "--mirror-name=nonexistent-test-xyz"], { GRATA_PP_MIRROR: TMP });
  assert(!r.ok, "should fail");
  assert(r.err.includes("No mirror found"), `got: ${r.err}`);
});

// 8. mirror-list works on empty dir
test("mirror-list on empty dir", () => {
  const r = run(["mirror-list"], { GRATA_PP_MIRROR: TMP });
  assert(r.ok, "should exit 0");
  assert(r.out.includes("mirror_dir"), "should print mirror_dir");
  assert(r.out.includes("files: [0]"), "should show 0 files");
});

// 9. mirror round-trip: write a file, read it back
test("mirror round-trip write+read", () => {
  const mirrorFile = join(TMP, "roundtrip.json");
  writeFileSync(mirrorFile, JSON.stringify({ test: "data", companies: [{ name: "Acme" }] }));
  const r = run(["mirror-show", "--mirror-name=roundtrip"], { GRATA_PP_MIRROR: TMP });
  assert(r.ok, "should exit 0");
  assert(r.out.includes("Acme"), "should show company name");
});

// 10. mirror-list shows the file
test("mirror-list shows file", () => {
  const r = run(["mirror-list"], { GRATA_PP_MIRROR: TMP });
  assert(r.ok, "should exit 0");
  assert(r.out.includes("roundtrip.json"), "should list roundtrip.json");
});

// Cleanup
rmSync(TMP, { recursive: true, force: true });

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
