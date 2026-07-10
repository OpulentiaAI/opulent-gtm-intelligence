// Mock-HTTP endpoint tests for grata-pp-cli.
// Intercepts global.fetch to verify every endpoint, method, path, headers, and request body.
// No network, no API key required. Run: node scripts/test-endpoints.js

import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const BIN = new URL("../dist/index.js", import.meta.url).pathname;
const FAKE_KEY = "test-key-12345";
const TMP_DIR = `/tmp/grata-endpoint-test-${Date.now()}`;
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

// Write a mock ESM preload script that patches globalThis.fetch
function createMockScript(callsFile) {
  const mockPath = join(TMP_DIR, `mock-${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(mockPath, `
const { writeFileSync } = await import("node:fs");
const calls = [];

globalThis.fetch = async (url, opts) => {
  calls.push({ url: String(url), method: opts?.method ?? "GET", headers: opts?.headers ?? {}, body: opts?.body ?? null });
  const u = String(url);
  if (u.includes("/search/")) {
    return { ok: true, status: 200, text: async () => JSON.stringify({ companies: [{ name: "Acme", company_uid: "ABC123", domain: "acme.com", description: "Test" }], count: 1, page_token: "tok1" }) };
  }
  if (u.includes("/similar-search/")) {
    return { ok: true, status: 200, text: async () => JSON.stringify({ company: { name: "Seed" }, results: [{ name: "Similar Co", company_uid: "SIM1", domain: "sim.com" }], count: 1, page_token: "" }) };
  }
  if (u.includes("/bulk-enrich/")) {
    return { ok: true, status: 200, text: async () => JSON.stringify({ errors: [], companies: [{ company_uid: "ABC123", name: "Acme", domain: "acme.com" }] }) };
  }
  if (u.includes("/enrich/")) {
    return { ok: true, status: 200, text: async () => JSON.stringify({ company_uid: "ABC123", name: "Acme", domain: "acme.com", revenue_estimates: "10M", headquarters: "Austin, TX" }) };
  }
  if (u.includes("/lists/create")) {
    return { ok: true, status: 200, text: async () => JSON.stringify({ name: "Test List", list_uid: "LIST1", created_date: "2024-01-01" }) };
  }
  if (u.includes("/lists/modify")) {
    return { ok: true, status: 200, text: async () => JSON.stringify({ processed: { count: 2, companies: [] }, not_processed: { count: 0, companies: [] } }) };
  }
  if (u.includes("/lists/")) {
    return { ok: true, status: 200, text: async () => JSON.stringify({ results: [{ name: "Existing List", list_uid: "EXIST1", company_count: 5 }], count: 1, page: 1, pages: 1 }) };
  }
  return { ok: true, status: 200, text: async () => JSON.stringify({}) };
};

// Capture calls on exit
process.on("exit", () => {
  try { writeFileSync("${callsFile}", JSON.stringify(calls)); } catch {}
});
`);
  return mockPath;
}

function runWithMock(args) {
  const callsFile = join(TMP_DIR, `calls-${Math.random().toString(36).slice(2)}.json`);
  const mockPath = createMockScript(callsFile);

  try {
    const out = execFileSync("node", ["--import", mockPath, BIN, ...args], {
      encoding: "utf8",
      env: {
        ...process.env,
        GRATA_API_KEY: FAKE_KEY,
        GRATA_PP_MIRROR: TMP_DIR,
      },
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
  if (expected.method) assert(call.method === expected.method, `method should be ${expected.method}, got: ${call.method}`);
  if (expected.authKey) {
    const auth = call.headers["Authorization"] ?? call.headers["authorization"];
    assert(auth === FAKE_KEY, `Authorization header should be "${FAKE_KEY}", got: ${auth}`);
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

// === search endpoint ===
test("search: POST to /api/v1.4/search/ with auth header", () => {
  const r = runWithMock(["search", "--terms=hvac,plumbing"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assert(r.calls.length === 1, `should make 1 call, got ${r.calls.length}`);
  assertCall(r.calls[0], {
    urlContains: "/api/v1.4/search/",
    method: "POST",
    authKey: true,
    bodyContains: {
      terms_include: {
        groups: [{ terms: ["hvac", "plumbing"], terms_operator: "any", terms_depth: "core" }],
        group_operator: "all",
      },
    },
  });
});

test("search: with all filters builds correct body", () => {
  const r = runWithMock(["search", "--terms=hvac", "--exclude=broker", "--employees=10,200", "--founded=1970,2018", "--ownership=investor_backed", "--business-models=software", "--end-customer=b2b", "--hq-country=United States", "--hq-state=TX", "--include-lists=L1", "--exclude-lists=L2", "--page-token=tok"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  const body = JSON.parse(r.calls[0].body);
  assert(body.terms_exclude[0] === "broker", "should have exclude terms");
  assert(body.grata_employees_estimates_range[0] === 10, "should have employee min");
  assert(body.grata_employees_estimates_range[1] === 200, "should have employee max");
  assert(body.year_founded[0] === 1970, "should have founded min");
  assert(body.ownership[0] === "investor_backed", "should have ownership");
  assert(body.business_models[0] === "software", "should have business_models");
  assert(body.end_customer[0] === "b2b", "should have end_customer");
  assert(body.headquarters.include[0].country === "United States", "should have HQ country");
  assert(body.headquarters.include[0].state === "TX", "should have HQ state");
  assert(body.lists.include[0] === "L1", "should have include lists");
  assert(body.lists.exclude[0] === "L2", "should have exclude lists");
  assert(body.page_token === "tok", "should have page token");
});

test("search: terms-depth and terms-op flags", () => {
  const r = runWithMock(["search", "--terms=hvac", "--terms-depth=mention", "--terms-op=all", "--group-op=any"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  const body = JSON.parse(r.calls[0].body);
  assert(body.terms_include.groups[0].terms_depth === "mention", "should have mention depth");
  assert(body.terms_include.groups[0].terms_operator === "all", "should have all operator");
  assert(body.terms_include.group_operator === "any", "should have any group operator");
});

// === similar endpoint ===
test("similar: POST to /api/v1.4/similar-search/ with domain seed", () => {
  const r = runWithMock(["similar", "--domain=slack.com"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assert(r.calls.length === 1, `should make 1 call`);
  assertCall(r.calls[0], {
    urlContains: "/api/v1.4/similar-search/",
    method: "POST",
    authKey: true,
    bodyContains: { domain: "slack.com" },
  });
});

test("similar: with company_uid seed", () => {
  const r = runWithMock(["similar", "--company-uid=ABC123"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], {
    urlContains: "/api/v1.4/similar-search/",
    bodyContains: { company_uid: "ABC123" },
  });
});

// === enrich endpoint ===
test("enrich: POST to /api/v1.4/enrich/ with domain", () => {
  const r = runWithMock(["enrich", "--domain=slack.com"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], {
    urlContains: "/api/v1.4/enrich/",
    method: "POST",
    authKey: true,
    bodyContains: { domain: "slack.com" },
  });
});

test("enrich: with company_uid", () => {
  const r = runWithMock(["enrich", "--company-uid=ABC123"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], {
    urlContains: "/api/v1.4/enrich/",
    bodyContains: { company_uid: "ABC123" },
  });
});

// === bulk-enrich endpoint ===
test("bulk-enrich: POST to /api/v1.4/bulk-enrich/ with domains", () => {
  const r = runWithMock(["bulk-enrich", "--domains=slack.com,stripe.com"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], {
    urlContains: "/api/v1.4/bulk-enrich/",
    method: "POST",
    authKey: true,
  });
  const body = JSON.parse(r.calls[0].body);
  assert(body.companies.length === 2, `should have 2 companies, got ${body.companies.length}`);
  assert(body.companies[0].domain === "slack.com", "first company domain");
  assert(body.companies[1].domain === "stripe.com", "second company domain");
});

test("bulk-enrich: with uids", () => {
  const r = runWithMock(["bulk-enrich", "--uids=UID1,UID2"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  const body = JSON.parse(r.calls[0].body);
  assert(body.companies[0].company_uid === "UID1", "first company uid");
  assert(body.companies[1].company_uid === "UID2", "second company uid");
});

// === lists endpoint ===
test("lists: POST to /api/v1.4/lists/", () => {
  const r = runWithMock(["lists"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], {
    urlContains: "/api/v1.4/lists/",
    method: "POST",
    authKey: true,
  });
});

// === list-create endpoint ===
test("list-create: POST to /api/v1.4/lists/create/ with name", () => {
  const r = runWithMock(["list-create", "--name=My List"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], {
    urlContains: "/api/v1.4/lists/create/",
    method: "POST",
    authKey: true,
    bodyContains: { name: "My List" },
  });
});

// === list-modify endpoint ===
test("list-modify: POST to /api/v1.4/lists/modify/ with add action", () => {
  const r = runWithMock(["list-modify", "--list-uid=L1", "--action=add", "--domains=a.com,b.com"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assertCall(r.calls[0], {
    urlContains: "/api/v1.4/lists/modify/",
    method: "POST",
    authKey: true,
    bodyContains: { list_uid: "L1", action: "add" },
  });
  const body = JSON.parse(r.calls[0].body);
  assert(body.companies.length === 2, "should have 2 companies");
  assert(body.companies[0].domain === "a.com", "first domain");
});

test("list-modify: with remove action and uids", () => {
  const r = runWithMock(["list-modify", "--list-uid=L1", "--action=remove", "--uids=U1,U2"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  const body = JSON.parse(r.calls[0].body);
  assert(body.action === "remove", "should have remove action");
  assert(body.companies[0].company_uid === "U1", "first uid");
});

// === sourcing-run compound endpoint ===
test("sourcing-run: makes search -> enrich -> lists -> list-create -> list-modify calls", () => {
  const r = runWithMock(["sourcing-run", "--terms=hvac", "--list-name=Test List", "--mirror-name=run1"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assert(r.calls.length >= 3, `should make at least 3 calls, got ${r.calls.length}`);
  assert(r.calls[0].url.includes("/api/v1.4/search/"), "first call should be search");
  assert(r.calls[1].url.includes("/api/v1.4/enrich/"), "second call should be enrich");
  const createCall = r.calls.find((c) => c.url.includes("/lists/create"));
  assert(createCall, "should call list-create");
  const modifyCall = r.calls.find((c) => c.url.includes("/lists/modify"));
  assert(modifyCall, "should call list-modify");
});

test("sourcing-run: with --domain uses similar-search", () => {
  const r = runWithMock(["sourcing-run", "--domain=slack.com", "--no-enrich"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  assert(r.calls[0].url.includes("/api/v1.4/similar-search/"), "first call should be similar-search");
});

test("sourcing-run: --no-enrich skips enrich calls", () => {
  const r = runWithMock(["sourcing-run", "--terms=hvac", "--no-enrich"]);
  assert(r.ok, `should exit 0, err: ${r.err}`);
  const enrichCalls = r.calls.filter((c) => c.url.includes("/enrich/"));
  assert(enrichCalls.length === 0, "should not make enrich calls with --no-enrich");
});

// === Content-Type and Accept headers ===
test("all POST calls have correct Content-Type and Accept headers", () => {
  const r = runWithMock(["search", "--terms=test"]);
  assert(r.ok, `should exit 0`);
  assert(r.calls[0].headers["Content-Type"] === "application/json", "should have Content-Type");
  assert(r.calls[0].headers["Accept"] === "application/json", "should have Accept");
});

// === --json output mode ===
test("--json flag outputs raw JSON", () => {
  const r = runWithMock(["search", "--terms=test", "--json"]);
  assert(r.ok, `should exit 0`);
  const parsed = JSON.parse(r.out.trim());
  assert(parsed.companies !== undefined, "should have companies in JSON output");
});

// Cleanup
rmSync(TMP_DIR, { recursive: true, force: true });

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
