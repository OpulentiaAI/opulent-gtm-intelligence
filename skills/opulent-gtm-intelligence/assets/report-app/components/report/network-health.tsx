import { NetworkCharts } from "./network-charts"
import { JsonGrid, plainLabel } from "./primitives"
import { cn } from "@/lib/utils"
import { records, type NetworkHealth, type NetworkSource } from "@/lib/report"

const knownKeys = [
  "metadata_only",
  "window_start",
  "window_end",
  "members",
  "sources",
  "people_resolved",
  "companies_resolved",
  "identity_resolution_rate",
  "interactions_total",
  "two_way_share",
  "edges_total",
  "edge_tier_coverage",
  "band_distribution",
  "store_manifest",
]

const sourceLabels: Record<string, string> = {
  gmail: "Gmail",
  calendar: "Calendar",
  crm: "CRM",
  linkedin_export: "LinkedIn export",
  slack: "Slack",
  imessage: "iMessage",
}

function num(value: unknown): number {
  return typeof value === "number" ? value : 0
}

function sourceName(value: unknown): string {
  const key = String(value || "Unnamed source")
  return sourceLabels[key] ?? plainLabel(key)
}

/**
 * Plain-language availability sentence for one ingestion source. The verbatim
 * blocked_read can carry endpoints or hostnames, so it renders only in the
 * audit layer's NetworkSourceDetail; here a blocked source gets a fixed
 * pointer sentence instead.
 */
const BLOCKED_POINTER = " The exact blocked read is recorded under Audit & provenance."

function availabilityLine(source: NetworkSource): string {
  const name = sourceName(source.source)
  const status = String(source.status || "unknown")
  const count = typeof source.interactions_ingested === "number" ? source.interactions_ingested.toLocaleString("en-US") : null
  const note = source.note != null && source.note !== "" ? ` ${String(source.note)}` : ""
  if (status === "available" && source.ingested === true) {
    return `${name} — connected and ingested${count !== null ? ` (${count} interactions)` : ""}.${note}`
  }
  if (status === "missing") return `${name} — not connected; nothing was read.${BLOCKED_POINTER}`
  if (status === "unauthenticated") return `${name} — connected but not authorized; nothing was read.${BLOCKED_POINTER}`
  if (status === "not_required") return `${name} — not required for this packet.${note}`
  return `${name} — ${status.replaceAll("_", " ")}; not ingested.${BLOCKED_POINTER}`
}

/**
 * Decision-layer dashboards: stat cards, the metadata-only badge, plain
 * source-availability sentences, and the Dither Kit coverage charts.
 * Cursors, member consent detail, and the store manifest live in the audit
 * layer's NetworkSourceDetail.
 */
export function NetworkDashboards({ health }: { health: NetworkHealth | null }) {
  if (!health) {
    return (
      <div className="card p-5 text-sm text-muted-foreground">
        No pooled network telemetry is recorded in this packet. Network dashboards appear only after member sources are connected and ingested; nothing is inferred without that record.
      </div>
    )
  }
  const sources = records(health.sources) as NetworkSource[]
  const tierRows = Object.entries(health.edge_tier_coverage ?? {}).map(([tier, value]) => ({ tier: `Tier ${tier}`, edges: num(value) }))
  const bandRows = Object.entries(health.band_distribution ?? {}).map(([band, value]) => ({ band, count: num(value) }))
  const stats = [
    { label: "People resolved", value: String(num(health.people_resolved)) },
    { label: "Companies resolved", value: String(num(health.companies_resolved)) },
    { label: "Interactions in window", value: String(num(health.interactions_total)) },
    { label: "Two-way share", value: `${num(health.two_way_share)}%` },
    { label: "Identity resolution", value: `${num(health.identity_resolution_rate)}%` },
    { label: "Edges", value: String(num(health.edges_total)) },
  ]

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {health.metadata_only === true && (
          <span className="pill border-accent-foreground/40 bg-accent font-semibold uppercase tracking-wider text-accent-foreground">Metadata only</span>
        )}
        {(health.window_start || health.window_end) && (
          <span className="pill">{String(health.window_start || "…")} → {String(health.window_end || "…")}</span>
        )}
      </div>
      {health.metadata_only === true && (
        <p className="measure text-xs text-muted-foreground">
          This graph stores interaction metadata only — participants, timestamps, and direction as recorded per source. Content is not part of this packet.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div className="card p-4" key={stat.label}>
            <p className="text-2xl tracking-tight tabular-nums">{stat.value}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="card divide-y">
        <p className="eyebrow p-4 pb-3">Source availability</p>
        {sources.map((source, index) => (
          <p className="p-4 text-sm leading-relaxed" key={index}>{availabilityLine(source)}</p>
        ))}
        {!sources.length && <p className="p-4 text-sm text-muted-foreground">No sources discovered or recorded.</p>}
      </div>

      <NetworkCharts tierRows={tierRows} bandRows={bandRows} />
    </div>
  )
}

function statusPillClass(status: string): string {
  if (status === "missing" || status === "unauthenticated") return "border-dashed text-muted-foreground"
  if (status === "not_required") return "text-muted-foreground"
  return ""
}

function SourceRow({ source }: { source: NetworkSource }) {
  const status = String(source.status || "unknown")
  const notIngested = status === "missing" || status === "unauthenticated"
  return (
    <div className={cn("p-4", notIngested && "bg-muted/35")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm">{String(source.source || "unnamed source")}</span>
        <span className={cn("pill", statusPillClass(status))}>{status.replaceAll("_", " ")}</span>
        <span className={cn("pill", !source.ingested && "text-muted-foreground")}>{source.ingested ? "ingested" : "not ingested"}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>interactions ingested · {typeof source.interactions_ingested === "number" ? source.interactions_ingested : "—"}</span>
        <span>cursor · {source.cursor ? String(source.cursor) : "none"}</span>
      </div>
      {source.note != null && source.note !== "" && <p className="mt-2 text-xs text-muted-foreground">{String(source.note)}</p>}
      {source.blocked_read != null && source.blocked_read !== "" && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-mono text-[10px] uppercase tracking-wider">blocked read</span> — {String(source.blocked_read)}
        </p>
      )}
    </div>
  )
}

/**
 * Audit-layer source detail: member consent list, the full per-source
 * discovery table including cursors and blocked reads, the store-manifest
 * line, and any additional recorded fields.
 */
export function NetworkSourceDetail({ health }: { health: NetworkHealth | null }) {
  if (!health) {
    return <p className="text-sm text-muted-foreground">No pooled network telemetry is recorded in this packet.</p>
  }
  const members = records(health.members)
  const sources = records(health.sources) as NetworkSource[]
  const manifest = health.store_manifest
  const extras = Object.keys(health).filter((key) => !knownKeys.includes(key))

  return (
    <div className="grid gap-4">
      <div className="card divide-y">
        <p className="eyebrow p-4 pb-3">Members</p>
        {members.map((member, index) => (
          <div className="flex flex-wrap items-center gap-2 p-4" key={index}>
            <span className="text-sm font-medium">{String(member.name || "Unnamed member")}</span>
            {member.role != null && member.role !== "" && <span className="pill">{String(member.role)}</span>}
            <span className={cn("pill", member.consent !== true && "border-dashed text-muted-foreground")}>
              {member.consent === true ? "consented" : "consent not recorded"}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              sources · {Array.isArray(member.sources_connected) && member.sources_connected.length
                ? member.sources_connected.map(String).join(", ")
                : "none connected"}
            </span>
          </div>
        ))}
        {!members.length && <p className="p-4 text-sm text-muted-foreground">No members recorded.</p>}
      </div>

      <div className="card divide-y">
        <p className="eyebrow p-4 pb-3">Source discovery</p>
        {sources.map((source, index) => (
          <SourceRow key={index} source={source} />
        ))}
        {!sources.length && <p className="p-4 text-sm text-muted-foreground">No sources discovered or recorded.</p>}
      </div>

      {manifest && (
        <p className="font-mono text-[11px] text-muted-foreground">
          store manifest · schema {String(manifest.schema_version || "—")} · {String(manifest.path || "—")} · last run {String(manifest.last_run_at || "—")} · {num(manifest.runs)} run(s)
        </p>
      )}

      {extras.length > 0 && (
        <div className="card p-5">
          <p className="eyebrow mb-3">Additional recorded fields</p>
          <JsonGrid value={health} omit={knownKeys} />
        </div>
      )}
    </div>
  )
}
