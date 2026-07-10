// Gmail API client. Base URL: https://gmail.googleapis.com/gmail/v1
// Auth: Bearer token in Authorization header. Read from GMAIL_ACCESS_TOKEN env or --token flag.
// For OAuth: obtain access token via Google OAuth flow with gmail.send scope.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1";

export class GmailError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "GmailError";
    this.status = status;
    this.body = body;
  }
}

export type Json = Record<string, unknown> | unknown[] | null;

export function resolveToken(flag?: string): string | undefined {
  if (flag) return flag;
  const env = process.env.GMAIL_ACCESS_TOKEN;
  if (env) return env;
  return undefined;
}

export function mirrorDir(): string {
  const dir = process.env.EMAIL_PP_MIRROR ?? join(homedir(), ".email-pp", "mirror");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function mirrorPath(name: string): string {
  return join(mirrorDir(), name);
}

export function loadMirror(name: string): Json | undefined {
  const p = mirrorPath(name);
  if (!existsSync(p)) return undefined;
  return JSON.parse(readFileSync(p, "utf8")) as Json;
}

export function saveMirror(name: string, data: Json): void {
  writeFileSync(mirrorPath(name), JSON.stringify(data, null, 2));
}

export function listMirrorFiles(): string[] {
  const dir = mirrorDir();
  return readdirSync(dir).filter((f) => f.endsWith(".json"));
}

async function request<T>(
  path: string,
  token: string,
  body: Json | null,
  method: "POST" | "GET" | "DELETE" = "GET",
): Promise<T> {
  const url = `${GMAIL_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body !== null && method !== "GET" ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    throw new GmailError(`Gmail API ${res.status} for ${method} ${path}`, res.status, parsed);
  }
  return parsed as T;
}

// Base64url encode (for Gmail message body)
export function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

// --- Endpoints ---

export interface GmailMessage {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: { name: string; value: string }[];
    body?: { data?: string; size?: number };
    parts?: { body?: { data?: string; size?: number }; mimeType?: string; headers?: { name: string; value: string }[] }[];
  };
  internalDate?: string;
}

export interface GmailMessageList {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface GmailLabel {
  id?: string;
  name?: string;
  type?: string;
}

export interface SendResponse {
  id: string;
  threadId?: string;
  labelIds?: string[];
}

// Get user profile
export function getProfile(token: string): Promise<{ emailAddress?: string; messagesTotal?: number; threadsTotal?: number }> {
  return request("/users/me/profile", token, null, "GET");
}

// List messages
export function listMessages(token: string, query?: { q?: string; maxResults?: number; pageToken?: string }): Promise<GmailMessageList> {
  const params = new URLSearchParams();
  if (query?.q) params.set("q", query.q);
  if (query?.maxResults) params.set("maxResults", String(query.maxResults));
  if (query?.pageToken) params.set("pageToken", query.pageToken);
  const qs = params.toString();
  return request<GmailMessageList>(`/users/me/messages${qs ? "?" + qs : ""}`, token, null, "GET");
}

// Get a single message
export function getMessage(token: string, id: string, format?: "full" | "metadata" | "raw"): Promise<GmailMessage> {
  const params = format ? `?format=${format}` : "";
  return request<GmailMessage>(`/users/me/messages/${id}${params}`, token, null, "GET");
}

// Send a message
export function sendMessage(token: string, raw: string): Promise<SendResponse> {
  return request<SendResponse>("/users/me/messages/send", token, { raw } as Json, "POST");
}

// Draft operations
export function createDraft(token: string, messageRaw: string): Promise<{ id: string; message?: GmailMessage }> {
  return request<{ id: string; message?: GmailMessage }>("/users/me/drafts", token, { message: { raw: messageRaw } } as Json, "POST");
}

export function listDrafts(token: string, maxResults?: number): Promise<{ drafts?: { id: string; message: GmailMessage }[]; nextPageToken?: string }> {
  const params = maxResults ? `?maxResults=${maxResults}` : "";
  return request(`/users/me/drafts${params}`, token, null, "GET");
}

export function sendDraft(token: string, draftId: string): Promise<SendResponse> {
  return request<SendResponse>(`/users/me/drafts/send`, token, { id: draftId } as Json, "POST");
}

export function deleteDraft(token: string, draftId: string): Promise<void> {
  return request<void>(`/users/me/drafts/${draftId}`, token, null, "DELETE");
}

// List labels
export function listLabels(token: string): Promise<{ labels?: GmailLabel[] }> {
  return request<{ labels?: GmailLabel[] }>("/users/me/labels", token, null, "GET");
}

// Build RFC 2822 message from parts
export function buildRfc2822(from: string, to: string[], subject: string, body: string, cc?: string[], replyTo?: string): string {
  const lines: string[] = [];
  lines.push(`From: ${from}`);
  lines.push(`To: ${to.join(", ")}`);
  if (cc && cc.length) lines.push(`Cc: ${cc.join(", ")}`);
  if (replyTo) lines.push(`Reply-To: ${replyTo}`);
  lines.push(`Subject: ${subject}`);
  lines.push("MIME-Version: 1.0");
  lines.push("Content-Type: text/plain; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: 8bit");
  lines.push("");
  lines.push(body);
  return lines.join("\r\n");
}
