"use client"

import { BarChart } from "@/components/dither-kit/bar-chart"
import { Bar } from "@/components/dither-kit/bar"
import { PieChart } from "@/components/dither-kit/pie-chart"
import { Pie } from "@/components/dither-kit/pie"
import { XAxis } from "@/components/dither-kit/x-axis"
import { YAxis } from "@/components/dither-kit/y-axis"
import { Legend } from "@/components/dither-kit/legend"
import { Tooltip } from "@/components/dither-kit/tooltip"
import type { ChartConfig } from "@/components/dither-kit/chart-context"
import type { DitherColor } from "@/components/dither-kit/palette"
import { JsonGrid } from "./primitives"
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

const bandColors: Record<string, DitherColor> = { strong: "green", familiar: "blue", weak: "orange", unknown: "grey" }

function num(value: unknown): number {
  return typeof value === "number" ? value : 0
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

export function NetworkHealthSection({ health }: { health: NetworkHealth | null }) {
  if (!health) {
    return (
      <div className="card p-5 text-sm text-muted-foreground">
        No pooled network telemetry is recorded in this packet. Network health appears only after member sources are connected and ingested; nothing is inferred without that record.
      </div>
    )
  }

  const members = records(health.members)
  const sources = records(health.sources) as NetworkSource[]
  const tierRows = Object.entries(health.edge_tier_coverage ?? {}).map(([tier, value]) => ({ tier: `Tier ${tier}`, edges: num(value) }))
  const tierConfig = { edges: { label: "Edges", color: "blue" } } satisfies ChartConfig
  const bandRows = Object.entries(health.band_distribution ?? {}).map(([band, value]) => ({ band, count: num(value) }))
  const bandConfig = Object.fromEntries(
    bandRows.map((row) => [row.band, { label: row.band.charAt(0).toUpperCase() + row.band.slice(1), color: bandColors[row.band] ?? "purple" }])
  ) as ChartConfig
  const manifest = health.store_manifest
  const extras = Object.keys(health).filter((key) => !knownKeys.includes(key))
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

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="card overflow-hidden p-5">
          <h3 className="font-medium">Edge evidence-tier coverage</h3>
          <p className="mt-1 text-xs text-muted-foreground">Pooled edges per evidence tier, read directly from network_health.edge_tier_coverage.</p>
          <div className="mt-4">
            <BarChart className="chart" data={tierRows.length ? tierRows : [{ tier: "No edges", edges: 0 }]} config={tierConfig} bloom="low" animate={false}>
              <XAxis dataKey="tier" /><YAxis /><Tooltip labelKey="tier" /><Bar dataKey="edges" variant="hatched" />
            </BarChart>
          </div>
        </article>
        <article className="card overflow-hidden p-5">
          <h3 className="font-medium">Relationship band distribution</h3>
          <p className="mt-1 text-xs text-muted-foreground">People per strength band, read directly from network_health.band_distribution.</p>
          <div className="mt-4">
            <PieChart className="chart" data={bandRows.length ? bandRows : [{ band: "unknown", count: 0 }]} config={bandConfig} dataKey="count" nameKey="band" innerRadius={0.52} bloom="low" animate={false}>
              <Pie variant="dotted" /><Legend isClickable align="center" /><Tooltip labelKey="band" />
            </PieChart>
          </div>
        </article>
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
