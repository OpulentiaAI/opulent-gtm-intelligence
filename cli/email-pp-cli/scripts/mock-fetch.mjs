// Mock fetch for email-pp-cli endpoint tests.

import { writeFileSync } from "node:fs";

const calls = [];

globalThis.fetch = async (url, opts) => {
  calls.push({ url: String(url), method: opts?.method ?? "GET", headers: opts?.headers ?? {}, body: opts?.body ?? null });
  const u = String(url);
  const m = opts?.method ?? "GET";

  if (u.endsWith("/users/me/profile") && m === "GET") {
    return { ok: true, status: 200, text: async () => JSON.stringify({ emailAddress: "agent@opulentia.ai", messagesTotal: 100, threadsTotal: 50 }) };
  }
  if (u.includes("/users/me/messages?") && m === "GET") {
    return { ok: true, status: 200, text: async () => JSON.stringify({ messages: [{ id: "msg1", threadId: "t1" }], resultSizeEstimate: 1 }) };
  }
  if (u.match(/\/users\/me\/messages\/msg1/) && m === "GET") {
    return {
      ok: true, status: 200,
      text: async () => JSON.stringify({
        id: "msg1", threadId: "t1", snippet: "Test email",
        payload: {
          headers: [{ name: "Subject", value: "Test" }, { name: "From", value: "a@b.com" }],
          body: { data: Buffer.from("Hello world").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") },
        },
      }),
    };
  }
  if (u.endsWith("/users/me/messages/send") && m === "POST") {
    return { ok: true, status: 200, text: async () => JSON.stringify({ id: "sent123", threadId: "t_sent", labelIds: ["SENT"] }) };
  }
  if (u.endsWith("/users/me/drafts") && m === "POST") {
    return { ok: true, status: 200, text: async () => JSON.stringify({ id: "draft123", message: { id: "msg_d" } }) };
  }
  if (u.includes("/users/me/drafts?") && m === "GET") {
    return { ok: true, status: 200, text: async () => JSON.stringify({ drafts: [{ id: "draft123", message: { id: "msg_d", snippet: "Draft" } }] }) };
  }
  if (u.endsWith("/users/me/drafts/send") && m === "POST") {
    return { ok: true, status: 200, text: async () => JSON.stringify({ id: "sent456", threadId: "t_sent2", labelIds: ["SENT"] }) };
  }
  if (u.match(/\/users\/me\/drafts\/draft_del$/) && m === "DELETE") {
    return { ok: true, status: 204, text: async () => "" };
  }
  if (u.endsWith("/users/me/labels") && m === "GET") {
    return { ok: true, status: 200, text: async () => JSON.stringify({ labels: [{ id: "INBOX", name: "INBOX", type: "system" }, { id: "SENT", name: "SENT", type: "system" }] }) };
  }
  return { ok: true, status: 200, text: async () => JSON.stringify({}) };
};

process.on("exit", () => {
  try { writeFileSync(process.env.MOCK_CALLS_FILE, JSON.stringify(calls)); } catch {}
});
