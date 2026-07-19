import { JsonGrid } from "./primitives"
import { cn } from "@/lib/utils"
import {
  numberValue,
  objectValue,
  records,
  type IntroLedgerEntry,
  type InteractionRollup,
  type RecordValue,
  type RelationshipEdge,
} from "@/lib/report"

const bandStyles: Record<string, string> = {
  strong: "border-foreground/50 bg-foreground/10 font-semibold",
  familiar: "border-foreground/30 bg-foreground/5 font-medium",
  weak: "text-muted-foreground",
  unknown: "border-dashed bg-muted/60 text-muted-foreground",
}

export function BandPill({ band }: { band?: string }) {
  if (!band) return null
  const key = band.toLowerCase()
  return <span className={cn("pill", bandStyles[key])}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
}

export function StrengthBreakdown({ components }: { components: RecordValue }) {
  const entries = Object.entries(components)
  if (!entries.length) return null
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 sm:grid-cols-5">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{key.replaceAll("_", " ")}</dt>
          <dd className="text-sm tabular-nums">{typeof value === "number" ? value : String(value ?? "—")}</dd>
        </div>
      ))}
    </dl>
  )
}

export function RelationshipLedger({ edges }: { edges: RelationshipEdge[] }) {
  if (!edges.length) return <div className="card p-5 text-sm text-muted-foreground">No verified relationship edges recorded.</div>
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {edges.map((edge, index) => {
        const components = objectValue(edge.strength_components)
        return (
          <article className="card p-5" key={index}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-medium tracking-tight">
                {String(edge.from || "Unknown")} → {String(edge.to || "Unknown")}
              </h3>
              <div className="flex flex-wrap gap-2">
                <BandPill band={typeof edge.band === "string" ? edge.band : undefined} />
                {edge.confidence != null && edge.confidence !== "" && <span className="pill">{String(edge.confidence)}</span>}
              </div>
            </div>
            {typeof edge.strength === "number" && (
              <p className="mt-3 text-xs text-muted-foreground">
                Strength <strong className="text-sm tabular-nums text-foreground">{edge.strength}</strong> / 100
                {edge.evidence_tier != null && edge.evidence_tier !== "" ? <> · Evidence tier {String(edge.evidence_tier)}</> : null}
              </p>
            )}
            {components && <StrengthBreakdown components={components} />}
            <div className="mt-4">
              <JsonGrid value={edge} omit={["from", "to", "band", "confidence", "strength", "strength_components", "evidence_tier"]} />
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function HopCard({ edge, index }: { edge: RelationshipEdge; index: number }) {
  return (
    <article className="rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="eyebrow">Hop {index + 1}</span>
        <span className="font-medium">{String(edge.from || "Unknown")}</span>
        <span aria-hidden="true">→</span>
        <span className="font-medium">{String(edge.to || "Unknown")}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {edge.type != null && edge.type !== "" && <span className="pill">{String(edge.type).replaceAll("_", " ")}</span>}
        <BandPill band={typeof edge.band === "string" ? edge.band : undefined} />
        {edge.evidence_tier != null && edge.evidence_tier !== "" && <span className="pill">Tier {String(edge.evidence_tier)}</span>}
        {typeof edge.strength === "number" && <span className="pill tabular-nums">Strength {edge.strength}</span>}
        {edge.confidence != null && edge.confidence !== "" && <span className="pill">{String(edge.confidence)}</span>}
      </div>
      <div className="mt-3">
        <JsonGrid value={edge} omit={["from", "to", "type", "band", "evidence_tier", "strength", "confidence"]} />
      </div>
    </article>
  )
}

export function HopConnector() {
  return <div aria-hidden="true" className="ml-6 h-4 w-px bg-border" />
}

const introStatusStyle: Record<string, string> = {
  proposed: "timeline-state-proposed",
  connector_approved: "timeline-state-proposed",
  sent: "timeline-state-complete",
  completed: "timeline-state-complete",
  declined: "timeline-state-not-applicable",
}

const introStatusNote: Record<string, string> = {
  proposed: "Proposed only — no consent confirmed and nothing has been sent.",
  connector_approved: "Connector approved the draft; the introduction has not been sent.",
  sent: "Sent by the connector from their own account.",
  completed: "Introduction completed.",
  declined: "Declined — no introduction occurred.",
}

const introKeys = ["target", "requester", "connector", "warm_path_ref", "status", "consent", "receipts"]

export function IntroLedger({ entries }: { entries: IntroLedgerEntry[] }) {
  if (!entries.length) {
    return <div className="card p-5 text-sm text-muted-foreground">No introduction requests are recorded in this packet.</div>
  }
  return (
    <div className="grid gap-4">
      {entries.map((entry, index) => {
        const status = String(entry.status || "proposed")
        const consent = objectValue(entry.consent)
        const receipts = records(entry.receipts)
        return (
          <article className="card p-5" key={index}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow mb-2">intro_ledger[{index}]</p>
                <h3 className="text-lg font-medium tracking-tight">{String(entry.target || "Unnamed target")}</h3>
              </div>
              <span className={cn("timeline-state", introStatusStyle[status] ?? "timeline-state-not-applicable")}>{status.replaceAll("_", " ")}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{introStatusNote[status] ?? "Status is preserved exactly as recorded; no completion is implied."}</p>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span>Requester <strong className="text-foreground">{String(entry.requester || "—")}</strong></span>
              <span>Connector <strong className="text-foreground">{String(entry.connector || "—")}</strong></span>
              <span>
                Connector consent{" "}
                <strong className="text-foreground">
                  {consent?.connector_consented === true ? `granted${consent.date ? ` · ${String(consent.date)}` : ""}` : "not granted"}
                </strong>
              </span>
              {typeof entry.warm_path_ref === "number" && (
                <span>
                  Path{" "}
                  <a className="underline decoration-border hover:decoration-foreground" href={`#warm-path-${entry.warm_path_ref}`}>
                    warm_paths[{entry.warm_path_ref}]
                  </a>
                </span>
              )}
            </div>

            {receipts.length > 0 && (
              <ol className="mt-4 divide-y rounded-xl border" aria-label="Introduction receipts">
                {receipts.map((receipt, receiptIndex) => (
                  <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3 text-sm" key={receiptIndex}>
                    <span className="pill">{String(receipt.stage || "stage").replaceAll("_", " ")}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{String(receipt.date || "undated")}</span>
                    <span className="text-xs text-muted-foreground">{String(receipt.evidence || "No receipt evidence recorded")}</span>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-4">
              <JsonGrid value={entry} omit={introKeys} />
            </div>
          </article>
        )
      })}
    </div>
  )
}

const rollupKeys = [
  "interactions_12mo",
  "two_way_threads",
  "meetings",
  "first_interaction_at",
  "last_interaction_at",
  "owners",
  "sources",
  "reciprocity_score",
  "note",
]

function rollupDate(value: unknown): string {
  return value == null || value === "" ? "None recorded" : String(value)
}

function rollupList(value: unknown): string {
  return Array.isArray(value) && value.length ? value.map(String).join(", ") : "None recorded"
}

export function InteractionRollupCard({ rollup }: { rollup: InteractionRollup }) {
  const zero =
    numberValue(rollup.interactions_12mo) === 0 && numberValue(rollup.two_way_threads) === 0 && numberValue(rollup.meetings) === 0
  const extras = Object.keys(rollup).filter((key) => !rollupKeys.includes(key))
  const stats = [
    { label: "Interactions · 12 mo", value: String(numberValue(rollup.interactions_12mo)) },
    { label: "Two-way threads", value: String(numberValue(rollup.two_way_threads)) },
    { label: "Meetings", value: String(numberValue(rollup.meetings)) },
    { label: "Reciprocity", value: `${numberValue(rollup.reciprocity_score)} / 10` },
  ]
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">First-party interaction rollup</p>
        {zero && <span className="pill border-dashed text-muted-foreground">No direct first-party interaction</span>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 text-2xl tracking-tight tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <dl className="json-grid mt-5 border-t pt-4 text-sm">
        <div className="contents">
          <dt>First interaction</dt>
          <dd>{rollupDate(rollup.first_interaction_at)}</dd>
        </div>
        <div className="contents">
          <dt>Last interaction</dt>
          <dd>{rollupDate(rollup.last_interaction_at)}</dd>
        </div>
        <div className="contents">
          <dt>Owners</dt>
          <dd>{rollupList(rollup.owners)}</dd>
        </div>
        <div className="contents">
          <dt>Sources</dt>
          <dd>{rollupList(rollup.sources)}</dd>
        </div>
      </dl>
      {rollup.note != null && rollup.note !== "" && <p className="prose-copy mt-4 text-sm">{String(rollup.note)}</p>}
      {extras.length > 0 && (
        <div className="mt-4">
          <JsonGrid value={rollup} omit={rollupKeys} />
        </div>
      )}
    </div>
  )
}
