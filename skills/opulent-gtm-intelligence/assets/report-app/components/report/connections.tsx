import { BandPill, HopCard, HopConnector } from "./network"
import { Fold, JsonGrid, plainLabel } from "./primitives"
import { cn } from "@/lib/utils"
import {
  numberValue,
  objectValue,
  records,
  type IntroLedgerEntry,
  type RelationshipEdge,
  type WarmPath,
} from "@/lib/report"

const edgeVerbs: Record<string, string> = {
  email_thread: "shares an active email thread with",
  colleague_overlap: "overlapped with",
  event_coattendance: "attended the same event as",
  linkedin_connection: "is connected on LinkedIn with",
  meeting: "has met with",
  intro: "was introduced to",
}

const activationWords: Record<string, string> = {
  warm_introduction: "a warm introduction",
  value_first_cold: "value-first cold outreach",
  direct_outreach: "direct outreach",
  reference_shared_context: "a shared-context reference",
}

export function activationModeWords(mode: unknown): string {
  const key = String(mode || "")
  if (!key) return "an unspecified approach"
  return activationWords[key] ?? key.replaceAll("_", " ")
}

function edgeClause(edge: RelationshipEdge): string {
  const from = String(edge.from || "Someone")
  const to = String(edge.to || "someone")
  const qualifiers = [
    edge.via != null && edge.via !== "" ? String(edge.via) : null,
    typeof edge.band === "string" ? edge.band : null,
  ].filter(Boolean)
  const suffix = qualifiers.length ? ` (${qualifiers.join("; ")})` : ""
  const verb = edgeVerbs[String(edge.type)]
  if (verb) return `${from} ${verb} ${to}${suffix}`
  return `${from} is linked to ${to} through ${String(edge.type || "a recorded relationship").replaceAll("_", " ")}${suffix}`
}

function nextActionSentence(value: unknown): string | null {
  const next = objectValue(value as never)
  if (!next) return null
  const when = next.when != null && next.when !== "" ? `, by ${String(next.when)}` : ""
  return `${String(next.action || "Action not recorded")} — ${String(next.owner || "owner not recorded")}${when}.`
}

const connectionKeys = [
  "target",
  "target_company",
  "objective",
  "status",
  "requester",
  "connector",
  "hops",
  "band",
  "min_edge_strength",
  "evidence_tier",
  "activation_mode",
  "edges",
  "risk",
  "next_action",
]

export function ConnectionCard({ path, index }: { path: WarmPath; index: number }) {
  const found = path.status === "path_found"
  const target = String(path.target || "Unnamed target")
  const edges = records(path.edges) as RelationshipEdge[]
  const clauses = edges.map(edgeClause).join(", and ")
  const headline = found
    ? path.connector
      ? `Ask ${String(path.connector)} to introduce ${String(path.requester || "the requester")} to ${target}${clauses ? ` — ${clauses}` : ""}.`
      : `Reach ${target} through the verified path${clauses ? ` — ${clauses}` : ""}.`
    : `No verified path to ${target} — ${activationModeWords(path.activation_mode)} using the dated trigger.`
  const action = nextActionSentence(path.next_action)
  const extras = Object.keys(path).filter((key) => !connectionKeys.includes(key))
  const hasEvidence = edges.length > 0 || extras.length > 0 || found
  return (
    <article className="card p-5" id={`warm-path-${index}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="eyebrow">{String(path.target_company || target)}</p>
        <div className="flex flex-wrap gap-2">
          {found ? (
            <BandPill band={typeof path.band === "string" ? path.band : undefined} />
          ) : (
            <span className="pill border-dashed text-muted-foreground">No verified path</span>
          )}
          <span className="pill">{activationModeWords(path.activation_mode)}</span>
        </div>
      </div>
      <p className="mt-3 text-base leading-relaxed">{headline}</p>
      {path.objective != null && path.objective !== "" && <p className="prose-copy mt-2 text-sm">{String(path.objective)}</p>}
      {!found && (
        <p className="mt-2 text-sm text-muted-foreground">
          No familiarity is implied; the absence of a verified path stays on the record.
        </p>
      )}
      {path.risk != null && path.risk !== "" && (
        <p className="mt-3 text-sm"><strong className="font-medium">Risk.</strong> {String(path.risk)}</p>
      )}
      {action && <p className="mt-2 text-sm"><strong className="font-medium">Next.</strong> {action}</p>}
      {hasEvidence && (
        <Fold summary="Evidence & scoring" tone="inline">
          <div className="flex flex-wrap gap-2">
            <span className="pill tabular-nums">Hops {numberValue(path.hops)}</span>
            <span className="pill tabular-nums">Weakest edge {numberValue(path.min_edge_strength)}/100</span>
            {path.evidence_tier != null && path.evidence_tier !== "" && <span className="pill">Tier {String(path.evidence_tier)}</span>}
          </div>
          {edges.length > 0 && (
            <ol className="mt-4 grid gap-0" aria-label={`Hop chain from ${String(path.requester || "requester")} to ${target}`}>
              <li><span className="pill">Requester · {String(path.requester || "Unknown")}</span></li>
              {edges.map((edge, edgeIndex) => (
                <li key={edgeIndex}>
                  <HopConnector />
                  <HopCard edge={edge} index={edgeIndex} />
                </li>
              ))}
              <li>
                <HopConnector />
                <span className="pill">Target · {target}</span>
              </li>
            </ol>
          )}
          {extras.length > 0 && (
            <div className="mt-4">
              <JsonGrid value={path} omit={connectionKeys} />
            </div>
          )}
        </Fold>
      )}
    </article>
  )
}

function introStatusLine(entry: IntroLedgerEntry): { text: string; badge: string; style: string } {
  const status = String(entry.status || "proposed")
  const connector = String(entry.connector || "the connector")
  const target = String(entry.target || "the target")
  const consent = objectValue(entry.consent)
  const date = consent?.date ? ` on ${String(consent.date)}` : ""
  switch (status) {
    case "proposed":
      return {
        text: `An introduction to ${target} is proposed and waiting on ${connector}'s consent — nothing has been sent.`,
        badge: "Proposed · not sent",
        style: "timeline-state-proposed",
      }
    case "connector_approved":
      return {
        text: `${connector} approved the introduction draft for ${target}${date} — drafted, not sent. ${connector} sends it from their own account.`,
        badge: "Drafted · not sent",
        style: "timeline-state-proposed",
      }
    case "sent":
      return { text: `${connector} sent the introduction to ${target} from their own account.`, badge: "Sent", style: "timeline-state-complete" }
    case "completed":
      return { text: `The introduction to ${target} is complete.`, badge: "Completed", style: "timeline-state-complete" }
    case "declined":
      return { text: `${connector} declined the introduction to ${target} — no introduction occurred.`, badge: "Declined", style: "timeline-state-not-applicable" }
    default:
      return {
        text: `Introduction to ${target}: recorded status is “${plainLabel(status).toLowerCase()}”; nothing further is implied.`,
        badge: plainLabel(status),
        style: "timeline-state-not-applicable",
      }
  }
}

export function Connections({ paths, intros }: { paths: WarmPath[]; intros: IntroLedgerEntry[] }) {
  return (
    <div className="grid gap-4">
      {!paths.length && (
        <div className="card p-5 text-sm text-muted-foreground">No warm-path computations are recorded in this packet.</div>
      )}
      {paths.map((path, index) => (
        <ConnectionCard key={index} path={path} index={index} />
      ))}
      {intros.length > 0 && (
        <div className="card divide-y">
          <p className="eyebrow p-4 pb-3">Introduction status</p>
          {intros.map((entry, index) => {
            const line = introStatusLine(entry)
            return (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4" key={index}>
                <p className="min-w-0 flex-1 text-sm leading-relaxed">{line.text}</p>
                <span className={cn("timeline-state", line.style)}>{line.badge}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
