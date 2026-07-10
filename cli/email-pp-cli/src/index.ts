#!/usr/bin/env node
// email-pp-cli - Token-efficient TypeScript CLI for the Gmail API.
// Printed in the style of cli-printing-press: agent-native flags, compound commands, local mirror.
// Includes a compound run-update-email command for Opulent GTM run updates.

import { parseArgs, getFlagStr, getFlagStrArr, getFlagNum, getFlagBool } from "./args.js";
import { output, printError, asJson } from "./output.js";
import {
  resolveToken,
  getProfile,
  listMessages,
  getMessage,
  sendMessage,
  createDraft,
  listDrafts,
  sendDraft,
  deleteDraft,
  listLabels,
  base64UrlEncode,
  base64UrlDecode,
  buildRfc2822,
  loadMirror,
  saveMirror,
  listMirrorFiles,
  GmailError,
  type Json,
} from "./client.js";

const HELP = `email-pp-cli - Gmail API CLI for sending, drafting, and reading email

Usage: email-pp-cli <command> [flags]

Commands:
  profile            Get the authenticated user's profile (email address)
  send               Send an email message
  draft              Create a draft email
  draft-send         Send an existing draft by ID
  draft-list         List drafts
  draft-delete       Delete a draft (destructive - requires --confirm)
  messages           List messages in inbox
  message            Get a single message by ID
  labels             List all labels
  run-update-email   Compound: build + send/draft an Opulent GTM run update
  mirror-show        Read a previously mirrored result set
  mirror-list        List files in the local mirror

Global flags:
  --token=TOKEN       Gmail OAuth access token (or GMAIL_ACCESS_TOKEN env)
  --json              Output raw JSON (default: compact agent-friendly)
  --help, -h          Show this help

Send/draft flags:
  --from=a@b.com          Sender email (required)
  --to=a@b.com,c@d.com    Recipients (comma-separated, required)
  --cc=a@b.com            CC recipients (comma-separated)
  --reply-to=a@b.com      Reply-To address
  --subject="Subject"     Email subject (required)
  --body="..."            Email body text (required for send/draft)
  --mirror-name=name      Save send/draft result to local mirror

Message flags:
  --id=MSG_ID             Message ID (for message get)
  --query="from:x@y.com"  Search query (for messages list)
  --max-results=10        Max results (default 20)
  --format=full           full | metadata | raw (default: full)

Run-update-email flags (compound):
  --from=a@b.com          Sender email (required)
  --to=a@b.com            Recipients (comma-separated, required)
  --subject="Run update"  Email subject (default: auto-generated)
  --company="Acme LLC"    Company or run name
  --stage="Priority review"  Current CRM stage
  --decision="pass"       Decision: pass, review, fail, inactive, needs info
  --next-action="Request a call"  Next action description
  --work="item1,item2"    Work completed (comma-separated)
  --verifications="sys1:verified,sys2:verified"  System update verifications
  --open-items="item1,item2"  Open items (comma-separated)
  --review="item1,item2"  Human review needed (comma-separated)
  --blocked="item1,item2"  Blocked items (comma-separated)
  --draft                 Create a draft instead of sending (default: send)
  --mirror-name=name      Save result to local mirror

Examples:
  email-pp-cli profile
  email-pp-cli send --from=agent@opulentia.ai --to=team@example.com --subject="Update" --body="Status: good"
  email-pp-cli draft --from=agent@opulentia.ai --to=team@example.com --subject="Draft" --body="Review needed"
  email-pp-cli messages --query="from:broker@ib.com" --max-results=5
  email-pp-cli message --id=abc123
  email-pp-cli labels
  email-pp-cli run-update-email --from=agent@opulentia.ai --to=team@example.com --company="Acme LLC" --stage="Priority review" --decision="act now" --next-action="Request a call" --work="Research,CRM update" --verifications="Attio:record verified" --draft
`;

async function cmdProfile(flags: Record<string, string | boolean>): Promise<void> {
  const token = requireToken(flags);
  const res = await getProfile(token);
  output(res, "profile", asJson(flags));
}

async function cmdSend(flags: Record<string, string | boolean>): Promise<void> {
  const token = requireToken(flags);
  const { from, to, cc, replyTo, subject, body } = requireEmailParts(flags);
  const rfc = buildRfc2822(from, to, subject, body, cc, replyTo);
  const raw = base64UrlEncode(rfc);
  const res = await sendMessage(token, raw);
  const mirrorName = getFlagStr(flags, "mirror-name");
  if (mirrorName) saveMirror(`${mirrorName}.json`, { sent: true, ...res } as Json);
  output({ sent: true, ...res }, "send", asJson(flags));
}

async function cmdDraft(flags: Record<string, string | boolean>): Promise<void> {
  const token = requireToken(flags);
  const { from, to, cc, replyTo, subject, body } = requireEmailParts(flags);
  const rfc = buildRfc2822(from, to, subject, body, cc, replyTo);
  const raw = base64UrlEncode(rfc);
  const res = await createDraft(token, raw);
  const mirrorName = getFlagStr(flags, "mirror-name");
  if (mirrorName) saveMirror(`${mirrorName}.json`, { drafted: true, ...res } as Json);
  output({ drafted: true, ...res }, "draft", asJson(flags));
}

async function cmdDraftSend(flags: Record<string, string | boolean>): Promise<void> {
  const token = requireToken(flags);
  const draftId = getFlagStr(flags, "id");
  if (!draftId) { printError("draft-send requires --id (draft ID)"); process.exit(1); }
  const res = await sendDraft(token, draftId);
  output({ sent: true, ...res }, "draft-send", asJson(flags));
}

async function cmdDraftList(flags: Record<string, string | boolean>): Promise<void> {
  const token = requireToken(flags);
  const maxResults = getFlagNum(flags, "max-results");
  const res = await listDrafts(token, maxResults ?? undefined);
  output(res, "drafts", asJson(flags));
}

async function cmdDraftDelete(flags: Record<string, string | boolean>): Promise<void> {
  const token = requireToken(flags);
  const draftId = getFlagStr(flags, "id");
  if (!draftId) { printError("draft-delete requires --id (draft ID)"); process.exit(1); }
  if (!getFlagBool(flags, "confirm")) { printError("draft-delete is destructive - pass --confirm to proceed"); process.exit(1); }
  await deleteDraft(token, draftId);
  output({ deleted: true, draft_id: draftId }, "draft-deleted", asJson(flags));
}

async function cmdMessages(flags: Record<string, string | boolean>): Promise<void> {
  const token = requireToken(flags);
  const query = getFlagStr(flags, "query");
  const maxResults = getFlagNum(flags, "max-results") ?? 20;
  const res = await listMessages(token, { q: query, maxResults });
  output(res, "messages", asJson(flags));
}

async function cmdMessage(flags: Record<string, string | boolean>): Promise<void> {
  const token = requireToken(flags);
  const id = getFlagStr(flags, "id");
  if (!id) { printError("message requires --id"); process.exit(1); }
  const format = (getFlagStr(flags, "format") ?? "full") as "full" | "metadata" | "raw";
  const res = await getMessage(token, id, format);
  // Decode body if present
  const out: Record<string, unknown> = { ...res };
  if (res.payload?.body?.data) {
    out.body_text = base64UrlDecode(res.payload.body.data);
  } else if (res.payload?.parts) {
    const textPart = res.payload.parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) out.body_text = base64UrlDecode(textPart.body.data);
  }
  // Extract headers
  if (res.payload?.headers) {
    const headers: Record<string, string> = {};
    for (const h of res.payload.headers) headers[h.name.toLowerCase()] = h.value;
    out.headers = headers;
  }
  output(out, "message", asJson(flags));
}

async function cmdLabels(flags: Record<string, string | boolean>): Promise<void> {
  const token = requireToken(flags);
  const res = await listLabels(token);
  output(res.labels ?? [], "labels", asJson(flags));
}

// Compound: build an Opulent GTM intelligence update and send or draft it.
async function cmdRunUpdateEmail(flags: Record<string, string | boolean>): Promise<void> {
  const token = requireToken(flags);
  const from = getFlagStr(flags, "from");
  const toStr = getFlagStr(flags, "to");
  if (!from || !toStr) { printError("run-update-email requires --from and --to"); process.exit(1); }
  const to = toStr.split(",").map((s) => s.trim()).filter(Boolean);

  const company = getFlagStr(flags, "company") ?? "Unknown";
  const stage = getFlagStr(flags, "stage") ?? "Unknown";
  const decision = getFlagStr(flags, "decision") ?? "needs review";
  const nextAction = getFlagStr(flags, "next-action") ?? "Not specified";
  const work = getFlagStrArr(flags, "work") ?? [];
  const verifications = getFlagStrArr(flags, "verifications") ?? [];
  const openItems = getFlagStrArr(flags, "open-items") ?? [];
  const review = getFlagStrArr(flags, "review") ?? [];
  const blocked = getFlagStrArr(flags, "blocked") ?? [];
  const isDraft = getFlagBool(flags, "draft");
  const mirrorName = getFlagStr(flags, "mirror-name");
  const cc = getFlagStrArr(flags, "cc");

  const subject = getFlagStr(flags, "subject") ?? `Opulent GTM intelligence update: ${company} - ${decision}`;

  // Build a concise, verification-first update.
  const bodyLines: string[] = [];
  bodyLines.push(`Hi,`);
  bodyLines.push("");
  bodyLines.push(`Here is the update from the latest Opulent GTM intelligence run.`);
  bodyLines.push("");
  bodyLines.push("Current status:");
  bodyLines.push(`- Stage: ${stage}`);
  bodyLines.push(`- Decision: ${decision}`);
  bodyLines.push(`- Next action: ${nextAction}`);
  bodyLines.push("");
  bodyLines.push("Work completed:");
  for (const w of work) bodyLines.push(`- ${w}`);
  if (work.length === 0) bodyLines.push("- (none)");
  bodyLines.push("");
  bodyLines.push("System update verification:");
  for (const v of verifications) bodyLines.push(`- ${v}`);
  if (verifications.length === 0) bodyLines.push("- (none)");
  bodyLines.push("");
  bodyLines.push("Open items:");
  for (const item of openItems) bodyLines.push(`- ${item}`);
  if (openItems.length === 0) bodyLines.push("- (none)");
  bodyLines.push("");
  bodyLines.push("Human review needed:");
  for (const item of review) bodyLines.push(`- ${item}`);
  if (review.length === 0) bodyLines.push("- (none)");
  bodyLines.push("");
  if (blocked.length > 0) {
    bodyLines.push("Blocked items:");
    for (const item of blocked) bodyLines.push(`- ${item}`);
    bodyLines.push("");
  }
  const body = bodyLines.join("\n");

  const rfc = buildRfc2822(from, to, subject, body, cc);
  const raw = base64UrlEncode(rfc);

  let result: Record<string, unknown>;
  if (isDraft) {
    const res = await createDraft(token, raw);
    result = { drafted: true, status: "drafted", draft_id: res.id, subject, recipients: to };
  } else {
    const res = await sendMessage(token, raw);
    result = { sent: true, status: "sent", message_id: res.id, subject, recipients: to };
  }

  if (mirrorName) {
    saveMirror(`${mirrorName}.json`, { ...result, body } as Json);
    result.mirror_saved = true;
  }

  output(result, "run-update-email", asJson(flags));
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
  output({ mirror_dir: "see EMAIL_PP_MIRROR", files }, "mirror-list", false);
}

function requireToken(flags: Record<string, string | boolean>): string {
  const token = resolveToken(getFlagStr(flags, "token"));
  if (!token) {
    printError("No Gmail access token. Set GMAIL_ACCESS_TOKEN env or pass --token.");
    console.error("Obtain an OAuth token with gmail.send scope from Google OAuth flow.");
    process.exit(1);
  }
  return token;
}

function requireEmailParts(flags: Record<string, string | boolean>): {
  from: string; to: string[]; cc?: string[]; replyTo?: string; subject: string; body: string;
} {
  const from = getFlagStr(flags, "from");
  const toStr = getFlagStr(flags, "to");
  const subject = getFlagStr(flags, "subject");
  const body = getFlagStr(flags, "body");
  if (!from) { printError("requires --from"); process.exit(1); }
  if (!toStr) { printError("requires --to"); process.exit(1); }
  if (!subject) { printError("requires --subject"); process.exit(1); }
  if (!body) { printError("requires --body"); process.exit(1); }
  const to = toStr.split(",").map((s) => s.trim()).filter(Boolean);
  const cc = getFlagStrArr(flags, "cc");
  const replyTo = getFlagStr(flags, "reply-to");
  return { from, to, cc, replyTo, subject, body };
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
      case "profile": await cmdProfile(flags); break;
      case "send": await cmdSend(flags); break;
      case "draft": await cmdDraft(flags); break;
      case "draft-send": await cmdDraftSend(flags); break;
      case "draft-list": await cmdDraftList(flags); break;
      case "draft-delete": await cmdDraftDelete(flags); break;
      case "messages": await cmdMessages(flags); break;
      case "message": await cmdMessage(flags); break;
      case "labels": await cmdLabels(flags); break;
      case "run-update-email": await cmdRunUpdateEmail(flags); break;
      case "mirror-show": await cmdMirrorShow(flags); break;
      case "mirror-list": await cmdMirrorList(); break;
      default:
        printError(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (err) {
    if (err instanceof GmailError) {
      printError(err.message, { status: err.status, body: err.body });
    } else {
      printError((err as Error).message);
    }
    process.exit(1);
  }
}

main();
