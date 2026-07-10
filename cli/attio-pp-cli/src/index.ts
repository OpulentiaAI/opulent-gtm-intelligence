#!/usr/bin/env node
// attio-pp-cli - Token-efficient TypeScript CLI for the Attio CRM API.
// Printed in the style of cli-printing-press: agent-native flags, compound commands, local mirror.

import { parseArgs, getFlagStr, getFlagStrArr, getFlagNum, getFlagBool } from "./args.js";
import { output, printError, asJson } from "./output.js";
import {
  resolveApiKey,
  listObjects,
  getObject,
  listLists,
  listRecords,
  findRecordById,
  findRecordByAttributes,
  createRecord,
  updateRecord,
  deleteRecord,
  listNotes,
  createNote,
  deleteNote,
  loadMirror,
  saveMirror,
  listMirrorFiles,
  AttioError,
  type Json,
  type AttioObject,
  type AttioList,
} from "./client.js";

const HELP = `attio-pp-cli - Attio CRM CLI for objects, lists, records, and notes

Usage: attio-pp-cli <command> [flags]

Commands:
  list-objects       List all objects in the workspace
  get-object         Get details and attributes for one object
  list-lists         List all lists in the workspace
  list-records       List records on an object (paginated)
  find-record        Find a record by ID or attribute filter
  create-record      Create a new record
  update-record      Update (patch) an existing record
  delete-record      Delete a record (destructive - requires --confirm)
  list-notes         List notes attached to a record
  create-note        Create a note on a record
  delete-note        Delete a note (destructive - requires --confirm)
  setup-check        Compound: verify workspace has Opulent GTM objects/lists/attributes
  ensure-structure   Compound: inspect -> report missing -> guide creation of required structure
  mirror-show        Read a previously mirrored result set
  mirror-list        List files in the local mirror

Global flags:
  --api-key=KEY   Attio API token (or ATTIO_API_KEY env)
  --json          Output raw JSON (default: compact agent-friendly)
  --help, -h      Show this help

Object/record flags:
  --object=companies    Object slug (people, companies, deals, or custom)
  --record-id=ID        Record UUID
  --limit=20            Page size
  --offset=0            Pagination offset

Find-record flags:
  --filter=key=value    Attribute filter (repeat or comma-separate: email=a@b.com,name=Foo)
  --record-id=ID        Fetch by ID (alternative to --filter)

Create/update-record flags:
  --values='{"name":[{"value":"Acme"}]}'  JSON attribute values
  --domain=example.com                   Shortcut: set website/domain attribute
  --name="Acme LLC"                      Shortcut: set name attribute

Note flags:
  --parent-object=companies   Object slug of parent record
  --parent-record-id=ID       Record UUID of parent
  --title="Meeting Notes"     Note title
  --content="..."             Note body
  --note-id=ID                Note ID (for delete)

Setup-check / ensure-structure flags:
  --mirror-name=setup-001     Save full setup report to local mirror

Examples:
  attio-pp-cli list-objects
  attio-pp-cli get-object --object=companies
  attio-pp-cli list-lists
  attio-pp-cli list-records --object=companies --limit=10
  attio-pp-cli find-record --object=people --filter=email=john@example.com
  attio-pp-cli create-record --object=companies --name="Acme LLC" --domain=acme.com
  attio-pp-cli update-record --object=companies --record-id=rec_123 --values='{"stage":[{"value":"Priority review"}]}'
  attio-pp-cli create-note --parent-object=companies --parent-record-id=rec_123 --title="Source" --content="Opulent web research 2026-07-09"
  attio-pp-cli setup-check
  attio-pp-cli ensure-structure
  attio-pp-cli mirror-show --mirror-name=setup-001
`;

// Optional Attio adapter structure for Opulent GTM intelligence packets.
const REQUIRED_OBJECTS = ["companies", "people", "deals"];
const REQUIRED_LISTS = ["Opulent GTM Intelligence", "Relationship Coverage"];
const REQUIRED_COMPANY_ATTRS = [
  "website", "industry", "geography", "source_type", "source_detail", "fit_score",
  "confidence", "why_now", "evidence_summary", "stage", "target_status", "last_touch",
  "next_touch", "account_owner", "do_not_contact",
];
const REQUIRED_PEOPLE_ATTRS = [
  "email_addresses", "job_title", "phone", "company", "role_type", "fit_score",
  "confidence", "why_now", "contact_source", "do_not_contact",
];

async function cmdListObjects(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const res = await listObjects(apiKey);
  output(res.data ?? [], "objects", asJson(flags));
}

async function cmdGetObject(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const objectId = getFlagStr(flags, "object");
  if (!objectId) { printError("get-object requires --object"); process.exit(1); }
  const res = await getObject(apiKey, objectId);
  output(res.data ?? {}, "object", asJson(flags));
}

async function cmdListLists(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const res = await listLists(apiKey);
  output(res.data ?? [], "lists", asJson(flags));
}

async function cmdListRecords(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const objectType = getFlagStr(flags, "object");
  if (!objectType) { printError("list-records requires --object"); process.exit(1); }
  const limit = getFlagNum(flags, "limit");
  const offset = getFlagNum(flags, "offset");
  const res = await listRecords(apiKey, objectType, limit, offset);
  output(res.data ?? [], "records", asJson(flags));
}

async function cmdFindRecord(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const objectType = getFlagStr(flags, "object");
  if (!objectType) { printError("find-record requires --object"); process.exit(1); }
  const recordId = getFlagStr(flags, "record-id");
  const filterStr = getFlagStr(flags, "filter");

  if (recordId) {
    const res = await findRecordById(apiKey, objectType, recordId);
    output(res.data ?? {}, "record", asJson(flags));
    return;
  }

  if (!filterStr) { printError("find-record requires --record-id or --filter"); process.exit(1); }

  const attributes: Record<string, string> = {};
  for (const pair of filterStr.split(",")) {
    const [k, ...rest] = pair.split("=");
    if (k && rest.length) attributes[k.trim()] = rest.join("=");
  }

  const limit = getFlagNum(flags, "limit");
  const offset = getFlagNum(flags, "offset");
  const res = await findRecordByAttributes(apiKey, objectType, attributes, limit, offset);
  output(res.data ?? [], "records", asJson(flags));
}

async function cmdCreateRecord(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const objectType = getFlagStr(flags, "object");
  if (!objectType) { printError("create-record requires --object"); process.exit(1); }

  const valuesJson = getFlagStr(flags, "values");
  const name = getFlagStr(flags, "name");
  const domain = getFlagStr(flags, "domain");

  let values: Record<string, unknown> = {};
  if (valuesJson) {
    values = JSON.parse(valuesJson) as Record<string, unknown>;
  }
  if (name) values.name = [{ value: name }];
  if (domain) {
    // Attio domain attribute is typically "website" on companies
    values.website = [{ value: domain }];
  }

  const res = await createRecord(apiKey, objectType, values);
  output(res.data ?? {}, "created", asJson(flags));
}

async function cmdUpdateRecord(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const objectType = getFlagStr(flags, "object");
  const recordId = getFlagStr(flags, "record-id");
  if (!objectType || !recordId) { printError("update-record requires --object and --record-id"); process.exit(1); }

  const valuesJson = getFlagStr(flags, "values");
  if (!valuesJson) { printError("update-record requires --values (JSON)"); process.exit(1); }

  const values = JSON.parse(valuesJson) as Record<string, unknown>;
  const res = await updateRecord(apiKey, objectType, recordId, values);
  output(res.data ?? {}, "updated", asJson(flags));
}

async function cmdDeleteRecord(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const objectType = getFlagStr(flags, "object");
  const recordId = getFlagStr(flags, "record-id");
  if (!objectType || !recordId) { printError("delete-record requires --object and --record-id"); process.exit(1); }
  if (!getFlagBool(flags, "confirm")) { printError("delete-record is destructive - pass --confirm to proceed"); process.exit(1); }

  await deleteRecord(apiKey, objectType, recordId);
  output({ deleted: true, object: objectType, record_id: recordId }, "deleted", asJson(flags));
}

async function cmdListNotes(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const parentObject = getFlagStr(flags, "parent-object");
  const parentRecordId = getFlagStr(flags, "parent-record-id");
  if (!parentObject || !parentRecordId) { printError("list-notes requires --parent-object and --parent-record-id"); process.exit(1); }
  const limit = getFlagNum(flags, "limit");
  const res = await listNotes(apiKey, parentObject, parentRecordId, limit);
  output(res.data ?? [], "notes", asJson(flags));
}

async function cmdCreateNote(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const parentObject = getFlagStr(flags, "parent-object");
  const parentRecordId = getFlagStr(flags, "parent-record-id");
  const title = getFlagStr(flags, "title");
  const content = getFlagStr(flags, "content");
  if (!parentObject || !parentRecordId || !title || !content) {
    printError("create-note requires --parent-object, --parent-record-id, --title, --content");
    process.exit(1);
  }
  const res = await createNote(apiKey, parentObject, parentRecordId, title, content);
  output(res.data ?? {}, "note-created", asJson(flags));
}

async function cmdDeleteNote(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const noteId = getFlagStr(flags, "note-id");
  if (!noteId) { printError("delete-note requires --note-id"); process.exit(1); }
  if (!getFlagBool(flags, "confirm")) { printError("delete-note is destructive - pass --confirm to proceed"); process.exit(1); }
  await deleteNote(apiKey, noteId);
  output({ deleted: true, note_id: noteId }, "note-deleted", asJson(flags));
}

// Compound: verify workspace has the optional Opulent GTM structure.
async function cmdSetupCheck(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const mirrorName = getFlagStr(flags, "mirror-name");

  // 1. List objects
  const objectsRes = await listObjects(apiKey);
  const objects = objectsRes.data ?? [];
  const objectSlugs = new Set(objects.map((o: AttioObject) => o.id?.object_id ?? o.name?.toLowerCase()));

  const objectReport = REQUIRED_OBJECTS.map((slug) => ({
    object: slug,
    present: objectSlugs.has(slug),
  }));

  // 2. Get attributes for each required object
  const attrReport: Record<string, { attribute: string; present: boolean }[]> = {};
  for (const slug of REQUIRED_OBJECTS) {
    if (!objectSlugs.has(slug)) {
      attrReport[slug] = REQUIRED_COMPANY_ATTRS.map((a) => ({ attribute: a, present: false }));
      continue;
    }
    try {
      const objDetail = await getObject(apiKey, slug);
      const existingAttrs = new Set(
        (objDetail.data?.attributes ?? []).map((a: { slug?: string; name?: string }) => a.slug ?? a.name?.toLowerCase()),
      );
      const required = slug === "companies" ? REQUIRED_COMPANY_ATTRS : slug === "people" ? REQUIRED_PEOPLE_ATTRS : [];
      attrReport[slug] = required.map((a) => ({ attribute: a, present: existingAttrs.has(a) }));
    } catch {
      attrReport[slug] = (slug === "companies" ? REQUIRED_COMPANY_ATTRS : slug === "people" ? REQUIRED_PEOPLE_ATTRS : [])
        .map((a) => ({ attribute: a, present: false, error: "could not fetch object" }));
    }
  }

  // 3. List lists
  const listsRes = await listLists(apiKey);
  const lists = listsRes.data ?? [];
  const listNames = new Set(lists.map((l: AttioList) => l.name));

  const listReport = REQUIRED_LISTS.map((name) => ({
    list: name,
    present: listNames.has(name),
  }));

  const report: Record<string, unknown> = {
    objects: objectReport,
    attributes: attrReport,
    lists: listReport,
    all_present:
      objectReport.every((o) => o.present) &&
      listReport.every((l) => l.present) &&
      Object.values(attrReport).every((attrs) => attrs.every((a) => a.present)),
  };

  if (mirrorName) {
    saveMirror(`${mirrorName}.json`, report as Json);
    (report as Record<string, unknown>).mirror_saved = true;
  }

  output(report, "setup-check", asJson(flags));
}

// Compound: inspect -> report exactly what's missing -> output actionable creation guide.
async function cmdEnsureStructure(flags: Record<string, string | boolean>): Promise<void> {
  const apiKey = requireApiKey(flags);
  const mirrorName = getFlagStr(flags, "mirror-name");

  // Run the setup check first
  const objectsRes = await listObjects(apiKey);
  const objects = objectsRes.data ?? [];
  const objectSlugs = new Set(objects.map((o: AttioObject) => o.id?.object_id ?? o.name?.toLowerCase()));

  const missingObjects = REQUIRED_OBJECTS.filter((slug) => !objectSlugs.has(slug));
  const missingAttrs: Record<string, string[]> = {};

  for (const slug of REQUIRED_OBJECTS) {
    if (!objectSlugs.has(slug)) {
      missingAttrs[slug] = slug === "companies" ? REQUIRED_COMPANY_ATTRS : slug === "people" ? REQUIRED_PEOPLE_ATTRS : [];
      continue;
    }
    try {
      const objDetail = await getObject(apiKey, slug);
      const existingAttrs = new Set(
        (objDetail.data?.attributes ?? []).map((a: { slug?: string; name?: string }) => a.slug ?? a.name?.toLowerCase()),
      );
      const required = slug === "companies" ? REQUIRED_COMPANY_ATTRS : slug === "people" ? REQUIRED_PEOPLE_ATTRS : [];
      missingAttrs[slug] = required.filter((a) => !existingAttrs.has(a));
    } catch {
      missingAttrs[slug] = slug === "companies" ? REQUIRED_COMPANY_ATTRS : slug === "people" ? REQUIRED_PEOPLE_ATTRS : [];
    }
  }

  const listsRes = await listLists(apiKey);
  const lists = listsRes.data ?? [];
  const listNames = new Set(lists.map((l: AttioList) => l.name));
  const missingLists = REQUIRED_LISTS.filter((name) => !listNames.has(name));

  // Build actionable guide
  const guide: string[] = [];
  for (const slug of missingObjects) {
    guide.push(`Create object '${slug}' in Attio UI: Settings > Data > Objects > New Object`);
  }
  for (const [slug, attrs] of Object.entries(missingAttrs)) {
    for (const attr of attrs) {
      guide.push(`Create attribute '${attr}' on object '${slug}' via POST /v2/objects/${slug}/attributes or Attio UI`);
    }
  }
  for (const name of missingLists) {
    guide.push(`Create list '${name}' via Attio UI or POST /v2/lists`);
  }

  const report: Record<string, unknown> = {
    missing_objects: missingObjects,
    missing_attributes: missingAttrs,
    missing_lists: missingLists,
    creation_guide: guide,
    complete: missingObjects.length === 0 && missingLists.length === 0 &&
      Object.values(missingAttrs).every((a) => a.length === 0),
  };

  if (mirrorName) {
    saveMirror(`${mirrorName}.json`, report as Json);
    (report as Record<string, unknown>).mirror_saved = true;
  }

  output(report, "ensure-structure", asJson(flags));
}

async function cmdMirrorShow(flags: Record<string, string | boolean>): Promise<void> {
  const mirrorName = getFlagStr(flags, "mirror-name");
  if (!mirrorName) { printError("mirror-show requires --mirror-name"); process.exit(1); }
  const data = loadMirror(`${mirrorName}.json`);
  if (!data) { printError(`No mirror found with name: ${mirrorName}`); process.exit(1); }
  output(data, "mirror", asJson(flags));
}

async function cmdMirrorList(): Promise<void> {
  const files = listMirrorFiles();
  output({ mirror_dir: "see ATTIO_PP_MIRROR", files }, "mirror-list", false);
}

function requireApiKey(flags: Record<string, string | boolean>): string {
  const key = resolveApiKey(getFlagStr(flags, "api-key"));
  if (!key) {
    printError("No Attio API key. Set ATTIO_API_KEY env or pass --api-key.");
    console.error("Get a token from Attio Settings > API tokens.");
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
      case "list-objects": await cmdListObjects(flags); break;
      case "get-object": await cmdGetObject(flags); break;
      case "list-lists": await cmdListLists(flags); break;
      case "list-records": await cmdListRecords(flags); break;
      case "find-record": await cmdFindRecord(flags); break;
      case "create-record": await cmdCreateRecord(flags); break;
      case "update-record": await cmdUpdateRecord(flags); break;
      case "delete-record": await cmdDeleteRecord(flags); break;
      case "list-notes": await cmdListNotes(flags); break;
      case "create-note": await cmdCreateNote(flags); break;
      case "delete-note": await cmdDeleteNote(flags); break;
      case "setup-check": await cmdSetupCheck(flags); break;
      case "ensure-structure": await cmdEnsureStructure(flags); break;
      case "mirror-show": await cmdMirrorShow(flags); break;
      case "mirror-list": await cmdMirrorList(); break;
      default:
        printError(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (err) {
    if (err instanceof AttioError) {
      printError(err.message, { status: err.status, body: err.body });
    } else {
      printError((err as Error).message);
    }
    process.exit(1);
  }
}

main();
