#!/usr/bin/env node
// grata-pp-cli - Token-efficient TypeScript CLI for the Grata API.
// Printed in the style of cli-printing-press: agent-native flags, compound commands, local mirror.

import { parseArgs, getFlagStr, getFlagStrArr, getFlagNum, getFlagNumArr, getFlagBool } from "./args.js";
import { output, printError, asJson } from "./output.js";
import {
  resolveApiKey,
  searchCompanies,
  similarSearch,
  enrichCompany,
  bulkEnrich,
  searchLists,
  createList,
  modifyList,
  loadMirror,
  saveMirror,
  GrataError,
  type Json,
  type SearchResponse,
  type SimilarResponse,
} from "./client.js";

const HELP = `grata-pp-cli - Grata company search, similar search, enrichment, and lists

Usage: grata-pp-cli <command> [flags]

Commands:
  search          Company search by keywords and filters
  similar         Similar-company search by seed domain or company_uid
  enrich          Enrich a single company by domain or company_uid
  bulk-enrich     Bulk enrich multiple companies
  lists           Search existing lists
  list-create     Create a new list
  list-modify     Add or remove companies from a list
  sourcing-run    Compound: search -> enrich -> save to list -> mirror locally
  mirror-show     Read a previously mirrored result set from local mirror
  mirror-list     List files in the local mirror

Global flags:
  --api-key=KEY   Grata API token (or GRATA_API_KEY env)
  --json          Output raw JSON (default: compact agent-friendly)
  --help, -h      Show this help

Search flags:
  --terms=a,b         Core terms (comma-separated, any-match within group)
  --exclude=a,b       Exclude terms
  --terms-depth=core  core | mention (default: core)
  --terms-op=any      any | all (within group, default: any)
  --group-op=all      any | all (across groups, default: all)
  --employees=10,100  Grata employee estimate range [min,max]
  --founded=1970,2018 Year founded range [min,max]
  --funding=0,100M    Funding size range [min,max] (use allowed bounds)
  --ownership=investor_backed  Comma-separated ownership filters
  --business-models=software   Comma-separated business models
  --end-customer=b2b,b2c       Comma-separated end customer types
  --hq-country=United States   Headquarters country
  --hq-state=TX                Headquarters state (requires country)
  --hq-city=Austin             Headquarters city (requires state)
  --include-lists=uid1,uid2    List UIDs to include
  --exclude-lists=uid1,uid2    List UIDs to exclude
  --page-token=TOKEN           Pagination token from prior result

Similar flags:
  --domain=example.com    Seed domain (preferred when known)
  --company-uid=UID       Seed company UID (alternative to domain)
  (also supports all search filters above)

Enrich flags:
  --domain=example.com    Company domain
  --company-uid=UID       Company UID

Bulk-enrich flags:
  --domains=a.com,b.com   Comma-separated domains
  --uids=UID1,UID2        Comma-separated company UIDs

List-create flags:
  --name="My List"        List name (required)

List-modify flags:
  --list-uid=UID          Target list UID (required)
  --action=add|remove     add or remove (required)
  --domains=a.com,b.com   Companies by domain
  --uids=UID1,UID2        Companies by UID

Sourcing-run flags (compound):
  --terms=a,b             Search terms (required if no --domain)
  --domain=example.com    Seed for similar search (alternative to --terms)
  --list-name="Run 1"     Create or reuse a list with this name
  --enrich                Enrich results before saving (default: true)
  --mirror-name=run-001   Save full result set to local mirror
  (also supports all search filters above)

Mirror flags:
  --mirror-name=run-001   Name of mirror file to read

Examples:
  grata-pp-cli search --terms="hvac,plumbing" --hq-state=TX --employees=10,200
  grata-pp-cli similar --domain=slack.com --business-models=software
  grata-pp-cli enrich --domain=slack.com
  grata-pp-cli bulk-enrich --domains=slack.com,stripe.com
  grata-pp-cli lists
  grata-pp-cli list-create --name="Texas HVAC Targets"
  grata-pp-cli list-modify --list-uid=L123 --action=add --domains=a.com,b.com
  grata-pp-cli sourcing-run --terms="hvac" --hq-state=TX --list-name="TX HVAC" --mirror-name=tx-hvac-001
  grata-pp-cli mirror-show --mirror-name=tx-hvac-001
`;

function buildSearchFilters(flags: Record<string, string | boolean>): Json {
  const terms = getFlagStrArr(flags, "terms");
  const exclude = getFlagStrArr(flags, "exclude");
  const termsDepth = getFlagStr(flags, "terms-depth") ?? "core";
  const termsOp = getFlagStr(flags, "terms-op") ?? "any";
  const groupOp = getFlagStr(flags, "group-op") ?? "all";
  const employees = getFlagNumArr(flags, "employees");
  const founded = getFlagNumArr(flags, "founded");
  const funding = getFlagStrArr(flags, "funding");
  const ownership = getFlagStrArr(flags, "ownership");
  const businessModels = getFlagStrArr(flags, "business-models");
  const endCustomer = getFlagStrArr(flags, "end-customer");
  const hqCountry = getFlagStr(flags, "hq-country");
  const hqState = getFlagStr(flags, "hq-state");
  const hqCity = getFlagStr(flags, "hq-city");
  const includeLists = getFlagStrArr(flags, "include-lists");
  const excludeLists = getFlagStrArr(flags, "exclude-lists");
  const pageToken = getFlagStr(flags, "page-token");

  const filters: Record<string, unknown> = {};

  if (terms) {
    filters.terms_include = {
      groups: [{ terms, terms_operator: termsOp, terms_depth: termsDepth }],
      group_operator: groupOp,
    };
  }
  if (exclude) filters.terms_exclude = exclude;
  if (pageToken) filters.page_token = pageToken;

  filters.lists = { include: includeLists ?? [], exclude: excludeLists ?? [] };

  if (endCustomer) filters.end_customer = endCustomer;
  if (ownership) filters.ownership = ownership;
  if (businessModels) filters.business_models = businessModels;
  if (funding) filters.funding_size = funding.map((f) => (f.endsWith("M") ? Number(f.slice(0, -1)) * 1_000_000 : Number(f)));
  if (employees) filters.grata_employees_estimates_range = employees;
  if (founded) filters.year_founded = founded;

  if (hqCountry || hqState || hqCity) {
    const hq: Record<string, string> = {};
    if (hqCountry) hq.country = hqCountry;
    if (hqState) hq.state = hqState;
    if (hqCity) hq.city = hqCity;
    filters.headquarters = { include: [hq] };
  }

  return filters as Json;
}

async function cmdSearch(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const filters = buildSearchFilters(flags);
  const res = await searchCompanies(apiKey, filters);
  output(res, "search", asJson(flags));
}

async function cmdSimilar(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const domain = getFlagStr(flags, "domain");
  const companyUid = getFlagStr(flags, "company-uid");
  if (!domain && !companyUid) {
    printError("similar requires --domain or --company-uid");
    process.exit(1);
  }
  const seed: Record<string, string> = {};
  if (domain) seed.domain = domain;
  if (companyUid) seed.company_uid = companyUid;
  const filters = buildSearchFilters(flags);
  const res = await similarSearch(apiKey, seed as Json, filters);
  output(res, "similar", asJson(flags));
}

async function cmdEnrich(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const domain = getFlagStr(flags, "domain");
  const companyUid = getFlagStr(flags, "company-uid");
  if (!domain && !companyUid) {
    printError("enrich requires --domain or --company-uid");
    process.exit(1);
  }
  const res = await enrichCompany(apiKey, { domain, company_uid: companyUid });
  output(res, "enrich", asJson(flags));
}

async function cmdBulkEnrich(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const domains = getFlagStrArr(flags, "domains") ?? [];
  const uids = getFlagStrArr(flags, "uids") ?? [];
  const companies: { domain?: string; company_uid?: string }[] = [];
  for (const d of domains) companies.push({ domain: d });
  for (const u of uids) companies.push({ company_uid: u });
  if (companies.length === 0) {
    printError("bulk-enrich requires --domains or --uids");
    process.exit(1);
  }
  const res = await bulkEnrich(apiKey, companies);
  output(res, "bulk-enrich", asJson(flags));
}

async function cmdLists(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const page = getFlagNum(flags, "page");
  const res = await searchLists(apiKey, page ? { page } : undefined);
  output(res, "lists", asJson(flags));
}

async function cmdListCreate(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const name = getFlagStr(flags, "name");
  if (!name) {
    printError("list-create requires --name");
    process.exit(1);
  }
  const res = await createList(apiKey, name);
  output(res, "list-create", asJson(flags));
}

async function cmdListModify(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const listUid = getFlagStr(flags, "list-uid");
  const action = getFlagStr(flags, "action");
  if (!listUid || !action) {
    printError("list-modify requires --list-uid and --action (add|remove)");
    process.exit(1);
  }
  if (action !== "add" && action !== "remove") {
    printError("--action must be add or remove");
    process.exit(1);
  }
  const domains = getFlagStrArr(flags, "domains") ?? [];
  const uids = getFlagStrArr(flags, "uids") ?? [];
  const companies: { domain?: string; company_uid?: string }[] = [];
  for (const d of domains) companies.push({ domain: d });
  for (const u of uids) companies.push({ company_uid: u });
  if (companies.length === 0) {
    printError("list-modify requires --domains or --uids");
    process.exit(1);
  }
  const res = await modifyList(apiKey, { list_uid: listUid, action, companies });
  output(res, "list-modify", asJson(flags));
}

// Compound command: search (or similar) -> optionally enrich -> save to list -> mirror locally.
async function cmdSourcingRun(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const terms = getFlagStrArr(flags, "terms");
  const seedDomain = getFlagStr(flags, "domain");
  const seedUid = getFlagStr(flags, "company-uid");
  const listName = getFlagStr(flags, "list-name");
  const noEnrich = getFlagBool(flags, "no-enrich");
  const enrich = !noEnrich && (getFlagBool(flags, "enrich") || flags["enrich"] === undefined); // default true
  const mirrorName = getFlagStr(flags, "mirror-name");

  if (!terms && !seedDomain && !seedUid) {
    printError("sourcing-run requires --terms (for search) or --domain/--company-uid (for similar)");
    process.exit(1);
  }

  // Step 1: search or similar
  let searchResult;
  if (seedDomain || seedUid) {
    const seed: Record<string, string> = {};
    if (seedDomain) seed.domain = seedDomain;
    if (seedUid) seed.company_uid = seedUid;
    const filters = buildSearchFilters(flags);
    searchResult = await similarSearch(apiKey, seed as Json, filters);
  } else {
    const filters = buildSearchFilters(flags);
    searchResult = await searchCompanies(apiKey, filters);
  }

  const companies =
    (searchResult as SearchResponse).companies ??
    (searchResult as SimilarResponse).results ??
    [];
  const runSummary: Record<string, unknown> = {
    search_type: seedDomain || seedUid ? "similar" : "search",
    result_count: searchResult.count ?? companies.length,
    page_token: searchResult.page_token ?? null,
    companies: companies as unknown[],
  };

  // Step 2: enrich (optional)
  if (enrich && companies.length > 0) {
    const enriched: unknown[] = [];
    for (const c of companies as { domain?: string; company_uid?: string }[]) {
      try {
        const e = await enrichCompany(apiKey, { domain: c.domain, company_uid: c.company_uid });
        enriched.push(e);
      } catch (err) {
        enriched.push({ domain: c.domain, company_uid: c.company_uid, enrich_error: (err as Error).message });
      }
    }
    runSummary.enriched = enriched;
  }

  // Step 3: save to list (optional)
  if (listName) {
    // Find or create the list
    let listUid: string | undefined;
    const existingLists = await searchLists(apiKey);
    const found = existingLists.results?.find((l) => l.name === listName);
    if (found?.list_uid) {
      listUid = found.list_uid;
    } else {
      const created = await createList(apiKey, listName);
      listUid = created.list_uid;
    }
    if (listUid) {
      const companiesToAdd = (companies as { domain?: string; company_uid?: string }[]).map((c) => ({
        domain: c.domain,
        company_uid: c.company_uid,
      }));
      const modRes = await modifyList(apiKey, { list_uid: listUid, action: "add", companies: companiesToAdd });
      runSummary.list = { list_uid: listUid, name: listName, modify: modRes };
    }
  }

  // Step 4: mirror locally
  if (mirrorName) {
    saveMirror(`${mirrorName}.json`, runSummary as Json);
    runSummary.mirror_saved = true;
  }

  output(runSummary, "sourcing-run", asJson(flags));
}

async function cmdMirrorShow(flags: Record<string, string | boolean>): Promise<void> {
  const mirrorName = getFlagStr(flags, "mirror-name");
  if (!mirrorName) {
    printError("mirror-show requires --mirror-name");
    process.exit(1);
  }
  const data = loadMirror(`${mirrorName}.json`);
  if (!data) {
    printError(`No mirror found with name: ${mirrorName}`);
    process.exit(1);
  }
  output(data, "mirror", asJson(flags));
}

async function cmdMirrorList(): Promise<void> {
  const { readdirSync } = await import("node:fs");
  const { mirrorDir } = await import("./client.js");
  const dir = mirrorDir();
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  output({ mirror_dir: dir, files }, "mirror-list", false);
}

function requireApiKey(flags: Record<string, string | boolean>): string {
  const key = resolveApiKey(getFlagStr(flags, "api-key"));
  if (!key) {
    printError("No Grata API key. Set GRATA_API_KEY env or pass --api-key.");
    console.error("Get a token from your Grata admin account settings.");
    process.exit(1);
  }
  return key;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    console.log(HELP);
    return;
  }

  const { flags, positional } = parseArgs(argv);
  const command = positional[0];

  try {
    switch (command) {
      case "search":
        await cmdSearch(flags);
        break;
      case "similar":
        await cmdSimilar(flags);
        break;
      case "enrich":
        await cmdEnrich(flags);
        break;
      case "bulk-enrich":
        await cmdBulkEnrich(flags);
        break;
      case "lists":
        await cmdLists(flags);
        break;
      case "list-create":
        await cmdListCreate(flags);
        break;
      case "list-modify":
        await cmdListModify(flags);
        break;
      case "sourcing-run":
        await cmdSourcingRun(flags);
        break;
      case "mirror-show":
        await cmdMirrorShow(flags);
        break;
      case "mirror-list":
        await cmdMirrorList();
        break;
      default:
        printError(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (err) {
    if (err instanceof GrataError) {
      printError(err.message, { status: err.status, body: err.body });
    } else {
      printError((err as Error).message);
    }
    process.exit(1);
  }
}

main();
