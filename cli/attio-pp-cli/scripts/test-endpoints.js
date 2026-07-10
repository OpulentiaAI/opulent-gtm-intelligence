// Mock-HTTP endpoint tests for attio-pp-cli.
// Uses scripts/mock-fetch.mjs to intercept global.fetch.
// No network, no API key required. Run: node scripts/test-endpoints.js

import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const BIN = new URL("../dist/index.js", import.meta.url).pathname;
const MOCK = new URL("./mock-fetch.mjs", import.meta.url).pathname;
const FAKE_KEY = "attio-test-key-67890";
const TMP_DIR = `/tmp/attio-endpoint-test-${Date.now()}`;
mkdirSync(TMP_DIR, { recursive: true });

let pass = 0;
let fail = 0;

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

function runWithMock(args) {
  const callsFile = join(TMP_DIR, `calls-${Math.random().toString(36).slice(2)}.json`);
  try {
    const out = execFileSync("node", ["--import", MOCK, BIN, ...args], {
      encoding: "utf8",
      env: { ...process.env, ATTIO_API_KEY: FAKE_KEY, ATTIO_PP_MIRROR: TMP_DIR, MOCK_CALLS_FILE: callsFile },
      timeout: 15000,
    });
    let calls = [];
    try { calls = JSON.parse(readFileSync(callsFile, "utf8")); } catch {}
    return { ok: true, out, err: "", calls };
  } catch (e) {
    let calls = [];
    try { calls = JSON.parse(readFileSync(callsFile, "utf8")); } catch {}
    return { ok: false, out: e.stdout ?? "", err: e.stderr ?? e.message ?? "", calls };
  }
}

function assertCall(call, expected) {
  assert(call, "no call was made");
  if (expected.urlContains) assert(call.url.includes(expected.urlContains), `URL should contain "${expected.urlContains}", got: ${call.url}`);
  if (expected.urlEquals) assert(call.url === expected.urlEquals, `URL should be "${expected.urlEquals}", got: ${call.url}`);
  if (expected.method) assert(call.method === expected.method, `method should be ${expected.method}, got: ${call.method}`);
  if (expected.authBearer) {
    const auth = call.headers["Authorization"];
    assert(auth === `Bearer ${FAKE_KEY}`, `Authorization should be "Bearer ${FAKE_KEY}", got: ${auth}`);
  }
  if (expected.bodyContains) {
    const body = call.body ? JSON.parse(call.body) : null;
    for (const [key, val] of Object.entries(expected.bodyContains)) {
      assert(body && key in body, `body should contain key "${key}", got: ${JSON.stringify(body)}`);
      if (val !== undefined) {
        assert(JSON.stringify(body[key]) === JSON.stringify(val), `body["${key}"] should be ${JSON.stringify(val)}, got: ${JSON.stringify(body[key])}`);
      }
    }
  }
}

// === list-objects ===
test("list-objects: GET /v2/objects with Bearer auth", () => {
  const r = runWithMock(["list-objects"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assert(r.calls.length === 1, `should make 1 call, got ${r.calls.length}`);
  assertCall(r.calls[0], { urlEquals: "https://api.attio.com/v2/objects", method: "GET", authBearer: true });
});

// === get-object ===
test("get-object: GET /v2/objects/{object_id}", () => {
  const r = runWithMock(["get-object", "--object=companies"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlEquals: "https://api.attio.com/v2/objects/companies", method: "GET", authBearer: true });
});

// === list-lists ===
test("list-lists: GET /v2/lists", () => {
  const r = runWithMock(["list-lists"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlEquals: "https://api.attio.com/v2/lists", method: "GET", authBearer: true });
});

// === list-records ===
test("list-records: GET /v2/objects/{object}/records with limit/offset", () => {
  const r = runWithMock(["list-records", "--object=companies", "--limit=10", "--offset=5"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlContains: "/v2/objects/companies/records", method: "GET", authBearer: true });
  assert(r.calls[0].url.includes("limit=10"), "should have limit=10");
  assert(r.calls[0].url.includes("offset=5"), "should have offset=5");
});

// === find-record by ID ===
test("find-record by ID: GET /v2/objects/{object}/records/{id}", () => {
  const r = runWithMock(["find-record", "--object=companies", "--record-id=rec_001"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlEquals: "https://api.attio.com/v2/objects/companies/records/rec_001", method: "GET", authBearer: true });
});

// === find-record by attributes ===
test("find-record by filter: POST /v2/objects/{object}/records/query", () => {
  const r = runWithMock(["find-record", "--object=companies", "--filter=email=test@example.com"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], {
    urlEquals: "https://api.attio.com/v2/objects/companies/records/query",
    method: "POST",
    authBearer: true,
    bodyContains: { filter: { email: "test@example.com" } },
  });
});

// === create-record ===
test("create-record: POST /v2/objects/{object}/records with name and domain shortcuts", () => {
  const r = runWithMock(["create-record", "--object=companies", "--name=Acme LLC", "--domain=acme.com"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlEquals: "https://api.attio.com/v2/objects/companies/records", method: "POST", authBearer: true });
  const body = JSON.parse(r.calls[0].body);
  assert(body.values.name[0].value === "Acme LLC", "should have name value");
  assert(body.values.website[0].value === "acme.com", "should have website value");
});

test("create-record: with raw --values JSON", () => {
  const r = runWithMock(["create-record", "--object=companies", '--values={"stage":[{"value":"Primary"}]}']);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  const body = JSON.parse(r.calls[0].body);
  assert(body.values.stage[0].value === "Primary", "should have stage value from --values");
});

// === update-record ===
test("update-record: PATCH /v2/objects/{object}/records/{id}", () => {
  const r = runWithMock(["update-record", "--object=companies", "--record-id=rec_001", '--values={"stage":[{"value":"Review"}]}']);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlEquals: "https://api.attio.com/v2/objects/companies/records/rec_001", method: "PATCH", authBearer: true });
  const body = JSON.parse(r.calls[0].body);
  assert(body.values.stage[0].value === "Review", "should have stage value");
});

// === delete-record ===
test("delete-record: DELETE with --confirm", () => {
  const r = runWithMock(["delete-record", "--object=companies", "--record-id=rec_del", "--confirm"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlEquals: "https://api.attio.com/v2/objects/companies/records/rec_del", method: "DELETE", authBearer: true });
});

// === list-notes ===
test("list-notes: GET /v2/notes with parent_object and parent_record_id", () => {
  const r = runWithMock(["list-notes", "--parent-object=companies", "--parent-record-id=rec_001"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlContains: "/v2/notes", method: "GET", authBearer: true });
  assert(r.calls[0].url.includes("parent_object=companies"), "should have parent_object");
  assert(r.calls[0].url.includes("parent_record_id=rec_001"), "should have parent_record_id");
});

// === create-note ===
test("create-note: POST /v2/notes with title and content", () => {
  const r = runWithMock(["create-note", "--parent-object=companies", "--parent-record-id=rec_001", "--title=Source", "--content=Opulent web research"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], {
    urlEquals: "https://api.attio.com/v2/notes",
    method: "POST",
    authBearer: true,
    bodyContains: { parent_object: "companies", parent_record_id: "rec_001", title: "Source", content: "Opulent web research" },
  });
});

// === delete-note ===
test("delete-note: DELETE /v2/notes/{id} with --confirm", () => {
  const r = runWithMock(["delete-note", "--note-id=note_del", "--confirm"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlEquals: "https://api.attio.com/v2/notes/note_del", method: "DELETE", authBearer: true });
});

// === setup-check compound ===
test("setup-check: calls list-objects, get-object x3, list-lists", () => {
  const r = runWithMock(["setup-check"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assert(r.calls.length >= 5, `should make at least 5 calls, got ${r.calls.length}`);
  assert(r.calls.find((c) => c.url === "https://api.attio.com/v2/objects" && c.method === "GET"), "should call list-objects");
  assert(r.calls.find((c) => c.url === "https://api.attio.com/v2/objects/companies" && c.method === "GET"), "should get-object for companies");
  assert(r.calls.find((c) => c.url === "https://api.attio.com/v2/objects/people" && c.method === "GET"), "should get-object for people");
  assert(r.calls.find((c) => c.url === "https://api.attio.com/v2/objects/deals" && c.method === "GET"), "should get-object for deals");
  assert(r.calls.find((c) => c.url === "https://api.attio.com/v2/lists" && c.method === "GET"), "should call list-lists");
});

// === ensure-structure compound ===
test("ensure-structure: calls list-objects, get-object x3, list-lists", () => {
  const r = runWithMock(["ensure-structure"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assert(r.calls.length >= 5, `should make at least 5 calls, got ${r.calls.length}`);
  assert(r.calls.find((c) => c.url === "https://api.attio.com/v2/objects" && c.method === "GET"), "should call list-objects");
  assert(r.calls.find((c) => c.url === "https://api.attio.com/v2/lists" && c.method === "GET"), "should call list-lists");
});

// === Headers ===
test("all calls have correct Content-Type and Accept headers", () => {
  const r = runWithMock(["create-record", "--object=companies", "--name=Test"]);
  assert(r.ok, `should exit 0`);
  assert(r.calls[0].headers["Content-Type"] === "application/json", "should have Content-Type");
  assert(r.calls[0].headers["Accept"] === "application/json", "should have Accept");
});

// === --json output ===
test("--json flag outputs raw JSON", () => {
  const r = runWithMock(["list-objects", "--json"]);
  assert(r.ok, `should exit 0`);
  const parsed = JSON.parse(r.out.trim());
  assert(Array.isArray(parsed), "should output JSON array");
});

// Cleanup
rmSync(TMP_DIR, { recursive: true, force: true });

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
