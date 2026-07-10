// Grata API client. Base URL: https://search.grata.com
// Auth: Authorization header (API token). Read from GRATA_API_KEY env or --api-key flag.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const GRATA_BASE = "https://search.grata.com";
export const API_VERSION = "v1.4";

export class GrataError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "GrataError";
    this.status = status;
    this.body = body;
  }
}

export type Json = Record<string, unknown> | unknown[] | null;

export function resolveApiKey(flag?: string): string | undefined {
  if (flag) return flag;
  const env = process.env.GRATA_API_KEY;
  if (env) return env;
  return undefined;
}

export function mirrorDir(): string {
  const dir = process.env.GRATA_PP_MIRROR ?? join(homedir(), ".grata-pp", "mirror");
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

async function request<T>(
  path: string,
  apiKey: string,
  body: Json,
  method: "POST" | "GET" | "PATCH" | "DELETE" = "POST",
): Promise<T> {
  const url = `${GRATA_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    throw new GrataError(`Grata API ${res.status} for ${path}`, res.status, parsed);
  }
  return parsed as T;
}

// --- Endpoints ---

export interface CompanyBasic {
  name?: string;
  company_uid?: string;
  url?: string;
  domain?: string;
  description?: string;
}

export interface SearchResponse {
  companies?: CompanyBasic[];
  count?: number;
  page_token?: string;
}

export interface SimilarResponse {
  company?: CompanyBasic;
  results?: CompanyBasic[];
  count?: number;
  page_token?: string;
}

export interface EnrichedCompany {
  company_uid?: string;
  name?: string;
  domain?: string;
  domains?: string[];
  description?: string;
  is_active?: boolean;
  headquarters?: unknown;
  locations?: unknown[];
  revenue_estimates?: unknown;
  grata_employee_estimates?: unknown;
  employees_on_professional_networks?: unknown;
  employees_growth?: unknown;
  primary_phone?: string;
  primary_email?: string;
  social_linkedin?: string;
  ownership_status?: string;
  entity_type?: string;
  owner?: unknown;
  ultimate_owner?: unknown;
  organization_type?: string;
  year_founded?: number;
  funding_stage?: string;
  total_funding?: number;
  keywords?: string[];
  end_customer?: string[];
  business_models?: string[];
  classifications?: unknown[];
  contacts?: { contacts?: unknown[] };
  url?: string;
  investors?: unknown[];
}

export interface BulkEnrichResponse {
  errors?: unknown[];
  companies?: EnrichedCompany[];
}

export interface GrataList {
  name?: string;
  list_uid?: string;
  created_date?: string;
  updated_date?: string;
  company_count?: number;
}

export interface ListSearchResponse {
  results?: GrataList[];
  count?: number;
  page?: number;
  pages?: number;
}

export interface ListModifyResponse {
  processed?: { count?: number; companies?: unknown[] };
  not_processed?: { count?: number; companies?: unknown[] };
}

export function searchCompanies(apiKey: string, filters: Json): Promise<SearchResponse> {
  return request<SearchResponse>(`/api/${API_VERSION}/search/`, apiKey, filters);
}

export function similarSearch(apiKey: string, seed: Json, filters?: Json): Promise<SimilarResponse> {
  const body = { ...seed, ...(filters ?? {}) };
  return request<SimilarResponse>(`/api/${API_VERSION}/similar-search/`, apiKey, body);
}

export function enrichCompany(apiKey: string, input: { domain?: string; company_uid?: string }): Promise<EnrichedCompany> {
  return request<EnrichedCompany>(`/api/${API_VERSION}/enrich/`, apiKey, input as Json);
}

export function bulkEnrich(apiKey: string, companies: { domain?: string; company_uid?: string }[]): Promise<BulkEnrichResponse> {
  return request<BulkEnrichResponse>(`/api/${API_VERSION}/bulk-enrich/`, apiKey, { companies } as unknown as Json);
}

export function searchLists(apiKey: string, query?: { page?: number }): Promise<ListSearchResponse> {
  return request<ListSearchResponse>(`/api/${API_VERSION}/lists/`, apiKey, (query ?? {}) as Json);
}

export function createList(apiKey: string, name: string): Promise<GrataList> {
  return request<GrataList>(`/api/${API_VERSION}/lists/create/`, apiKey, { name } as Json);
}

export function modifyList(
  apiKey: string,
  input: { list_uid: string; action: "add" | "remove"; companies: { domain?: string; company_uid?: string }[] },
): Promise<ListModifyResponse> {
  return request<ListModifyResponse>(`/api/${API_VERSION}/lists/modify/`, apiKey, input as unknown as Json);
}
