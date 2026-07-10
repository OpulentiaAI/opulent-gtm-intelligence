// Attio API client. Base URL: https://api.attio.com/v2
// Auth: Bearer token in Authorization header. Read from ATTIO_API_KEY env or --api-key flag.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const ATTIO_BASE = "https://api.attio.com/v2";

export class AttioError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "AttioError";
    this.status = status;
    this.body = body;
  }
}

export type Json = Record<string, unknown> | unknown[] | null;

export function resolveApiKey(flag?: string): string | undefined {
  if (flag) return flag;
  const env = process.env.ATTIO_API_KEY;
  if (env) return env;
  return undefined;
}

export function mirrorDir(): string {
  const dir = process.env.ATTIO_PP_MIRROR ?? join(homedir(), ".attio-pp", "mirror");
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
  apiKey: string,
  body: Json | null,
  method: "POST" | "GET" | "PATCH" | "DELETE" = "GET",
): Promise<T> {
  const url = `${ATTIO_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
    throw new AttioError(`Attio API ${res.status} for ${method} ${path}`, res.status, parsed);
  }
  return parsed as T;
}

// --- Endpoints ---

export interface AttioObject {
  id?: { object_id?: string };
  name?: string;
  singular_noun?: string;
  plural_noun?: string;
  attributes?: AttioAttribute[];
}

export interface AttioAttribute {
  id?: { attribute_id?: string };
  name?: string;
  slug?: string;
  type?: string;
}

export interface AttioList {
  id?: { list_id?: string };
  name?: string;
  api_slug?: string;
  parent_object?: string;
}

export interface AttioRecord {
  id?: { record_id?: string };
  values?: Record<string, unknown>;
}

export interface AttioNote {
  id?: { note_id?: string };
  title?: string;
  content?: string;
  created_at?: string;
}

// Objects
export function listObjects(apiKey: string): Promise<{ data?: AttioObject[] }> {
  return request<{ data?: AttioObject[] }>("/objects", apiKey, null, "GET");
}

export function getObject(apiKey: string, objectId: string): Promise<{ data?: AttioObject }> {
  return request<{ data?: AttioObject }>(`/objects/${objectId}`, apiKey, null, "GET");
}

// Lists
export function listLists(apiKey: string): Promise<{ data?: AttioList[] }> {
  return request<{ data?: AttioList[] }>("/lists", apiKey, null, "GET");
}

// Records
export function listRecords(apiKey: string, objectType: string, limit?: number, offset?: number): Promise<{ data?: AttioRecord[] }> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));
  const qs = params.toString();
  return request<{ data?: AttioRecord[] }>(`/objects/${objectType}/records${qs ? "?" + qs : ""}`, apiKey, null, "GET");
}

export function findRecordById(apiKey: string, objectType: string, recordId: string): Promise<{ data?: AttioRecord }> {
  return request<{ data?: AttioRecord }>(`/objects/${objectType}/records/${recordId}`, apiKey, null, "GET");
}

export function findRecordByAttributes(apiKey: string, objectType: string, attributes: Record<string, unknown>, limit?: number, offset?: number): Promise<{ data?: AttioRecord[] }> {
  const body: Record<string, unknown> = { filter: attributes };
  if (limit) body.limit = limit;
  if (offset) body.offset = offset;
  return request<{ data?: AttioRecord[] }>(`/objects/${objectType}/records/query`, apiKey, body as Json, "POST");
}

export function createRecord(apiKey: string, objectType: string, values: Record<string, unknown>): Promise<{ data?: AttioRecord }> {
  return request<{ data?: AttioRecord }>(`/objects/${objectType}/records`, apiKey, { values } as Json, "POST");
}

export function updateRecord(apiKey: string, objectType: string, recordId: string, values: Record<string, unknown>): Promise<{ data?: AttioRecord }> {
  return request<{ data?: AttioRecord }>(`/objects/${objectType}/records/${recordId}`, apiKey, { values } as Json, "PATCH");
}

export function deleteRecord(apiKey: string, objectType: string, recordId: string): Promise<void> {
  return request<void>(`/objects/${objectType}/records/${recordId}`, apiKey, null, "DELETE");
}

// Notes
export function listNotes(apiKey: string, parentObject: string, parentRecordId: string, limit?: number): Promise<{ data?: AttioNote[] }> {
  const params = new URLSearchParams();
  params.set("parent_object", parentObject);
  params.set("parent_record_id", parentRecordId);
  if (limit) params.set("limit", String(limit));
  return request<{ data?: AttioNote[] }>(`/notes?${params.toString()}`, apiKey, null, "GET");
}

export function createNote(apiKey: string, parentObject: string, parentRecordId: string, title: string, content: string): Promise<{ data?: AttioNote }> {
  return request<{ data?: AttioNote }>(`/notes`, apiKey, { parent_object: parentObject, parent_record_id: parentRecordId, title, content } as Json, "POST");
}

export function deleteNote(apiKey: string, noteId: string): Promise<void> {
  return request<void>(`/notes/${noteId}`, apiKey, null, "DELETE");
}
