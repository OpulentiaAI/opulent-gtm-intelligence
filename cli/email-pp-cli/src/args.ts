// Minimal flag parser. Supports --flag=value, --flag value, --bool, and positional args.
// No external deps - keeps the CLI token-light and install-free.

export interface ParsedArgs {
  flags: Record<string, string | boolean>;
  positional: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx > -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        flags[key] = val;
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

export function getFlagStr(flags: Record<string, string | boolean>, key: string): string | undefined {
  const v = flags[key];
  if (v === undefined || typeof v === "boolean") return undefined;
  return v;
}

export function getFlagBool(flags: Record<string, string | boolean>, key: string): boolean {
  return flags[key] === true || flags[key] === "true";
}

export function getFlagStrArr(flags: Record<string, string | boolean>, key: string): string[] | undefined {
  const v = flags[key];
  if (v === undefined || typeof v === "boolean") return undefined;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export function getFlagNum(flags: Record<string, string | boolean>, key: string): number | undefined {
  const v = getFlagStr(flags, key);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export function getFlagNumArr(flags: Record<string, string | boolean>, key: string): number[] | undefined {
  const v = getFlagStr(flags, key);
  if (v === undefined) return undefined;
  return v.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
}
