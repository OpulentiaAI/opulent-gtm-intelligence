// Mock-HTTP endpoint tests for email-pp-cli.

import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const BIN = new URL("../dist/index.js", import.meta.url).pathname;
const MOCK = new URL("./mock-fetch.mjs", import.meta.url).pathname;
const FAKE_TOKEN = "gmail-test-token-abc";
const TMP_DIR = `/tmp/email-endpoint-test-${Date.now()}`;
mkdirSync(TMP_DIR, { recursive: true });

let pass = 0, fail = 0;

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); pass++; }
  catch (e) { console.error(`  FAIL: ${name}\n    ${e.message}`); fail++; }
}

function assert(cond, msg) { if (!cond) throw new Error(msg ?? "assertion failed"); }

function runWithMock(args) {
  const callsFile = join(TMP_DIR, `calls-${Math.random().toString(36).slice(2)}.json`);
  try {
    const out = execFileSync("node", ["--import", MOCK, BIN, ...args], {
      encoding: "utf8",
      env: { ...process.env, GMAIL_ACCESS_TOKEN: FAKE_TOKEN, EMAIL_PP_MIRROR: TMP_DIR, MOCK_CALLS_FILE: callsFile },
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
    assert(call.headers["Authorization"] === `Bearer ${FAKE_TOKEN}`, `Authorization should be Bearer token, got: ${call.headers["Authorization"]}`);
  }
  if (expected.bodyContains) {
    const body = call.body ? JSON.parse(call.body) : null;
    for (const [key, val] of Object.entries(expected.bodyContains)) {
      assert(body && key in body, `body should contain key "${key}", got: ${JSON.stringify(body)}`);
    }
  }
}

// === profile ===
test("profile: GET /users/me/profile with Bearer auth", () => {
  const r = runWithMock(["profile"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assert(r.calls.length === 1, `should make 1 call`);
  assertCall(r.calls[0], { urlContains: "/users/me/profile", method: "GET", authBearer: true });
});

// === send ===
test("send: POST /users/me/messages/send with base64url raw body", () => {
  const r = runWithMock(["send", "--from=agent@opulentia.ai", "--to=team@example.com", "--subject=Test", "--body=Hello"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlEquals: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", method: "POST", authBearer: true });
  const body = JSON.parse(r.calls[0].body);
  assert(body.raw !== undefined, "body should have raw field");
  // Verify the base64url decodes to an RFC2822 message with correct headers
  const decoded = Buffer.from(body.raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  assert(decoded.includes("From: agent@opulentia.ai"), "should have From header");
  assert(decoded.includes("To: team@example.com"), "should have To header");
  assert(decoded.includes("Subject: Test"), "should have Subject header");
  assert(decoded.includes("Hello"), "should have body text");
});

// === draft ===
test("draft: POST /users/me/drafts with message raw", () => {
  const r = runWithMock(["draft", "--from=agent@opulentia.ai", "--to=team@example.com", "--subject=Draft", "--body=Review"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlEquals: "https://gmail.googleapis.com/gmail/v1/users/me/drafts", method: "POST", authBearer: true });
  const body = JSON.parse(r.calls[0].body);
  assert(body.message && body.message.raw, "body should have message.raw");
  const decoded = Buffer.from(body.message.raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  assert(decoded.includes("Subject: Draft"), "should have Subject header");
});

// === draft-send ===
test("draft-send: POST /users/me/drafts/send with draft ID", () => {
  const r = runWithMock(["draft-send", "--id=draft123"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlEquals: "https://gmail.googleapis.com/gmail/v1/users/me/drafts/send", method: "POST", authBearer: true });
  const body = JSON.parse(r.calls[0].body);
  assert(body.id === "draft123", "should have draft ID in body");
});

// === draft-list ===
test("draft-list: GET /users/me/drafts", () => {
  const r = runWithMock(["draft-list"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlContains: "/users/me/drafts", method: "GET", authBearer: true });
});

// === draft-delete ===
test("draft-delete: DELETE /users/me/drafts/{id} with --confirm", () => {
  const r = runWithMock(["draft-delete", "--id=draft_del", "--confirm"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlContains: "/users/me/drafts/draft_del", method: "DELETE", authBearer: true });
});

// === messages ===
test("messages: GET /users/me/messages with query and maxResults", () => {
  const r = runWithMock(["messages", "--query=from:broker@ib.com", "--max-results=5"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlContains: "/users/me/messages", method: "GET", authBearer: true });
  assert(r.calls[0].url.includes("q=from"), "should have query param");
  assert(r.calls[0].url.includes("maxResults=5"), "should have maxResults=5");
});

// === message ===
test("message: GET /users/me/messages/{id} with format", () => {
  const r = runWithMock(["message", "--id=msg1", "--format=full"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlContains: "/users/me/messages/msg1", method: "GET", authBearer: true });
  assert(r.calls[0].url.includes("format=full"), "should have format=full");
  // Check that body is decoded
  assert(r.out.includes("Hello world"), "should decode and show body text");
});

// === labels ===
test("labels: GET /users/me/labels", () => {
  const r = runWithMock(["labels"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], { urlEquals: "https://gmail.googleapis.com/gmail/v1/users/me/labels", method: "GET", authBearer: true });
});

// === run-update-email compound (send mode) ===
test("run-update-email: sends email with correct body structure", () => {
  const r = runWithMock([
    "run-update-email",
    "--from=agent@opulentia.ai",
    "--to=team@example.com",
    "--company=Acme LLC",
    "--stage=Priority review",
    "--decision=pass",
    "--next-action=Request a call",
    "--work=Opulent web research,Attio update",
    "--verifications=Attio:record created,Email:verified",
  ]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assert(r.calls.length === 1, `should make 1 call (send)`);
  assertCall(r.calls[0], { urlContains: "/messages/send", method: "POST", authBearer: true });
  const body = JSON.parse(r.calls[0].body);
  const decoded = Buffer.from(body.raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
  assert(decoded.includes("Opulent GTM intelligence update: Acme LLC - pass"), "should have auto-generated subject");
  assert(decoded.includes("Stage: Priority review"), "should have stage in body");
  assert(decoded.includes("Decision: pass"), "should have decision in body");
  assert(decoded.includes("Next action: Request a call"), "should have next action in body");
  assert(decoded.includes("Opulent web research"), "should have work item in body");
  assert(decoded.includes("Attio:record created"), "should have verification in body");
});

// === run-update-email compound (draft mode) ===
test("run-update-email: --draft creates draft instead of sending", () => {
  const r = runWithMock([
    "run-update-email",
    "--from=agent@opulentia.ai",
    "--to=team@example.com",
    "--company=Acme LLC",
    "--stage=Review",
    "--decision=review",
    "--draft",
  ]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assert(r.calls.length === 1, `should make 1 call (draft)`);
  assertCall(r.calls[0], { urlContains: "/drafts", method: "POST", authBearer: true });
  assert(!r.calls[0].url.includes("/send"), "should not call send endpoint");
});

// === Headers ===
test("all calls have correct Content-Type and Accept headers", () => {
  const r = runWithMock(["send", "--from=a@b.com", "--to=c@d.com", "--subject=T", "--body=B"]);
  assert(r.ok, `should exit 0`);
  assert(r.calls[0].headers["Content-Type"] === "application/json", "should have Content-Type");
  assert(r.calls[0].headers["Accept"] === "application/json", "should have Accept");
});

// === --json output ===
test("--json flag outputs raw JSON", () => {
  const r = runWithMock(["profile", "--json"]);
  assert(r.ok, `should exit 0`);
  const parsed = JSON.parse(r.out.trim());
  assert(parsed.emailAddress !== undefined, "should have emailAddress in JSON output");
});

// Cleanup
rmSync(TMP_DIR, { recursive: true, force: true });

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
