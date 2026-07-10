// Mock fetch for attio-pp-cli endpoint tests.
// Patches globalThis.fetch to intercept and record all API calls.
// Writes captured calls to the file path in MOCK_CALLS_FILE env var on process exit.

import { writeFileSync } from "node:fs";

const calls = [];

globalThis.fetch = async (url, opts) => {
  calls.push({
    url: String(url),
    method: opts?.method ?? "GET",
    headers: opts?.headers ?? {},
    body: opts?.body ?? null,
  });
  const u = String(url);
  const m = opts?.method ?? "GET";

  // GET /v2/objects
  if (u === "https://api.attio.com/v2/objects" && m === "GET") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: [
          { id: { object_id: "companies" }, name: "Companies", attributes: [{ slug: "name", name: "Name", type: "text" }] },
          { id: { object_id: "people" }, name: "People", attributes: [{ slug: "email_addresses", name: "Email", type: "email" }] },
          { id: { object_id: "deals" }, name: "Deals", attributes: [{ slug: "stage", name: "Stage", type: "select" }] },
        ],
      }),
    };
  }

  // GET /v2/objects/{id}
  if (u === "https://api.attio.com/v2/objects/companies" && m === "GET") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: {
          id: { object_id: "companies" },
          name: "Companies",
          attributes: [
            { slug: "name", name: "Name", type: "text" },
            { slug: "website", name: "Website", type: "domain" },
            { slug: "stage", name: "Stage", type: "select" },
          ],
        },
      }),
    };
  }
  if (u === "https://api.attio.com/v2/objects/people" && m === "GET") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: {
          id: { object_id: "people" },
          name: "People",
          attributes: [
            { slug: "email_addresses", name: "Email", type: "email" },
            { slug: "name", name: "Name", type: "text" },
          ],
        },
      }),
    };
  }
  if (u === "https://api.attio.com/v2/objects/deals" && m === "GET") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: {
          id: { object_id: "deals" },
          name: "Deals",
          attributes: [{ slug: "stage", name: "Stage", type: "select" }],
        },
      }),
    };
  }

  // GET /v2/lists
  if (u === "https://api.attio.com/v2/lists" && m === "GET") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: [{ id: { list_id: "list1" }, name: "Opulent GTM Intelligence", parent_object: "companies" }],
      }),
    };
  }

  // GET /v2/objects/{object}/records (list)
  if (u.includes("/objects/companies/records?") && m === "GET") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: [{ id: { record_id: "rec_001" }, values: { name: [{ value: "Acme" }] } }],
      }),
    };
  }
  if (u.endsWith("/objects/companies/records") && m === "GET") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: [{ id: { record_id: "rec_001" }, values: { name: [{ value: "Acme" }] } }],
      }),
    };
  }

  // GET /v2/objects/{object}/records/{id}
  if (u.endsWith("/objects/companies/records/rec_001") && m === "GET") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: { id: { record_id: "rec_001" }, values: { name: [{ value: "Acme" }] } },
      }),
    };
  }

  // POST /v2/objects/{object}/records/query
  if (u.endsWith("/objects/companies/records/query") && m === "POST") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: [{ id: { record_id: "rec_001" }, values: { name: [{ value: "Acme" }] } }],
      }),
    };
  }

  // POST /v2/objects/{object}/records (create)
  if (u.endsWith("/objects/companies/records") && m === "POST") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: { id: { record_id: "rec_new" }, values: {} },
      }),
    };
  }

  // PATCH /v2/objects/{object}/records/{id}
  if (u.endsWith("/objects/companies/records/rec_001") && m === "PATCH") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: { id: { record_id: "rec_001" }, values: {} },
      }),
    };
  }

  // DELETE /v2/objects/{object}/records/{id}
  if (u.endsWith("/objects/companies/records/rec_del") && m === "DELETE") {
    return { ok: true, status: 204, text: async () => "" };
  }

  // GET /v2/notes?...
  if (u.includes("/notes?") && m === "GET") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: [{ id: { note_id: "note_1" }, title: "Test", content: "Body", created_at: "2024-01-01" }],
      }),
    };
  }

  // POST /v2/notes
  if (u === "https://api.attio.com/v2/notes" && m === "POST") {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        data: { id: { note_id: "note_new" }, title: "Test" },
      }),
    };
  }

  // DELETE /v2/notes/{id}
  if (u.endsWith("/notes/note_del") && m === "DELETE") {
    return { ok: true, status: 204, text: async () => "" };
  }

  // Default
  return { ok: true, status: 200, text: async () => JSON.stringify({ data: {} }) };
};

process.on("exit", () => {
  try {
    writeFileSync(process.env.MOCK_CALLS_FILE, JSON.stringify(calls));
  } catch {}
});
