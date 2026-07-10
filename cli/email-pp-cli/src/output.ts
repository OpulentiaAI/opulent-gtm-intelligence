// Output helpers. Compact by default for agent token efficiency. --json for raw JSON.

import type { Json } from "./client.js";

export function printCompact(label: string, data: unknown): void {
  const lines = renderCompact(label, data, 0);
  for (const line of lines) console.log(line);
}

function renderCompact(label: string, data: unknown, depth: number): string[] {
  const indent = "  ".repeat(depth);
  const out: string[] = [];

  if (data === null || data === undefined) {
    out.push(`${indent}${label}: (none)`);
    return out;
  }

  if (Array.isArray(data)) {
    out.push(`${indent}${label}: [${data.length}]`);
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const name = (item as { name?: string }).name ?? (item as { domain?: string }).domain ?? `#${i}`;
        out.push(`${indent}  - ${name}`);
        for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
          if (k === "name" || k === "domain") continue;
          if (v === null || v === undefined || v === "") continue;
          if (typeof v === "object") {
            out.push(...renderCompact(k, v, depth + 2));
          } else {
            out.push(`${indent}    ${k}: ${truncate(String(v))}`);
          }
        }
      } else {
        out.push(`${indent}  - ${truncate(String(item))}`);
      }
    }
    return out;
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      out.push(`${indent}${label}: {}`);
      return out;
    }
    if (depth === 0) {
      for (const [k, v] of entries) {
        out.push(...renderCompact(k, v, depth));
      }
    } else {
      out.push(`${indent}${label}:`);
      for (const [k, v] of entries) {
        if (v === null || v === undefined || v === "") continue;
        if (typeof v === "object") {
          out.push(...renderCompact(k, v, depth + 1));
        } else {
          out.push(`${indent}  ${k}: ${truncate(String(v))}`);
        }
      }
    }
    return out;
  }

  out.push(`${indent}${label}: ${truncate(String(data))}`);
  return out;
}

function truncate(s: string, max = 120): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "...";
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printError(message: string, detail?: unknown): void {
  console.error(`ERROR: ${message}`);
  if (detail !== undefined) {
    console.error(JSON.stringify(detail, null, 2));
  }
}

export function output(data: unknown, label: string, asJson: boolean): void {
  if (asJson) {
    printJson(data);
  } else {
    printCompact(label, data);
  }
}

export function asJson(flags: Record<string, string | boolean>): boolean {
  return flags["json"] === true || flags["json"] === "true";
}

// Type re-export to avoid unused import warnings
export type { Json };
