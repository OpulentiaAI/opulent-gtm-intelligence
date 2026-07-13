"use client"

import { BarChart } from "@/components/dither-kit/bar-chart"
import { Bar } from "@/components/dither-kit/bar"
import { PieChart } from "@/components/dither-kit/pie-chart"
import { Pie } from "@/components/dither-kit/pie"
import { RadarChart } from "@/components/dither-kit/radar-chart"
import { Radar } from "@/components/dither-kit/radar"
import { XAxis } from "@/components/dither-kit/x-axis"
import { YAxis } from "@/components/dither-kit/y-axis"
import { Legend } from "@/components/dither-kit/legend"
import { Tooltip } from "@/components/dither-kit/tooltip"
import type { ChartConfig } from "@/components/dither-kit/chart-context"
import type { DitherColor } from "@/components/dither-kit/palette"
import type { RecordValue } from "@/lib/report"

const palette: DitherColor[] = ["blue", "green", "orange"]
const componentKeys = ["novelty", "magnitude", "relevance", "actionability", "evidence_quality", "relationship_leverage"] as const

function num(value: unknown) {
  return typeof value === "number" ? value : 0
}

export function Analytics({ targets, signals, dataHealth }: { targets: RecordValue[]; signals: RecordValue[]; dataHealth: RecordValue }) {
  const ratings = targets.map((target) => ({ name: String(target.name || "Unnamed").slice(0, 18), rating: num(target.fit_score) }))
  const targetConfig = { rating: { label: "Fit rating", color: "blue" } } satisfies ChartConfig
  const signalRows = componentKeys.map((component) => ({
    component: component.replace("_", " "),
    average: signals.length ? Math.round(signals.reduce((sum, signal) => sum + num(signal[component]), 0) / signals.length) : 0,
  }))
  const signalConfig = { average: { label: "Average component", color: "green" } } satisfies ChartConfig
  const counts = ["Verified", "Estimated", "Unknown"].map((confidence) => ({
    confidence,
    count: [...targets, ...signals].filter((item) => item.confidence === confidence).length,
  }))
  const confidenceConfig = Object.fromEntries(counts.map((row, index) => [row.confidence, { label: row.confidence, color: palette[index] }])) as ChartConfig
  const healthRows = [
    { metric: "Coverage", value: num(dataHealth.verified_field_coverage) },
    { metric: "Uniqueness", value: 100 - num(dataHealth.duplicate_rate) },
    { metric: "Freshness", value: 100 - num(dataHealth.stale_rate) },
    { metric: "Conflict free", value: Math.max(0, 100 - (num(dataHealth.conflicts) / Math.max(1, num(dataHealth.records_reviewed))) * 100) },
  ]
  const healthConfig = { value: { label: "Health score", color: "purple" } } satisfies ChartConfig

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Target rating distribution" note="Existing fit_score values, ranked by target.">
        <BarChart className="chart" data={ratings.length ? ratings : [{ name: "No targets", rating: 0 }]} config={targetConfig} bloom="low" animate={false}>
          <XAxis dataKey="name" /><YAxis /><Tooltip labelKey="name" /><Bar dataKey="rating" variant="hatched" />
        </BarChart>
      </ChartCard>
      <ChartCard title="Signal-component analysis" note="Mean of the six additive signal score components.">
        <RadarChart className="chart" data={signalRows} config={signalConfig} nameKey="component" bloom="aura" animate={false}>
          <Radar dataKey="average" variant="gradient" /><Legend />
        </RadarChart>
      </ChartCard>
      <ChartCard title="Confidence composition" note="Composition across targets and signals; no synthetic confidence is introduced.">
        <PieChart className="chart" data={counts} config={confidenceConfig} dataKey="count" nameKey="confidence" innerRadius={0.52} bloom="low" animate={false}>
          <Pie variant="dotted" /><Legend isClickable align="center" /><Tooltip labelKey="confidence" />
        </PieChart>
      </ChartCard>
      <ChartCard title="Data-health composition" note="Coverage, inverse duplicate/stale rates, and conflicts normalized by reviewed records.">
        <RadarChart className="chart" data={healthRows} config={healthConfig} nameKey="metric" bloom="low" animate={false}>
          <Radar dataKey="value" variant="hatched" /><Legend />
        </RadarChart>
      </ChartCard>
    </div>
  )
}

function ChartCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return <article className="card overflow-hidden p-5"><h3 className="font-medium">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{note}</p><div className="mt-4">{children}</div></article>
}
