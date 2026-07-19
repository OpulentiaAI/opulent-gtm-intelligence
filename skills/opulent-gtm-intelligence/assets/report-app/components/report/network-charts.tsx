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

const bandColors: Record<string, DitherColor> = { strong: "green", familiar: "blue", weak: "orange", unknown: "grey" }

export type TierRow = { tier: string; edges: number }
export type BandRow = { band: string; count: number }

/**
 * Dither Kit network-coverage charts, fed deterministic rows derived from the
 * packet's edge-tier coverage and band-distribution records.
 */
export function NetworkCharts({ tierRows, bandRows }: { tierRows: TierRow[]; bandRows: BandRow[] }) {
  const tierConfig = { edges: { label: "Edges", color: "blue" } } satisfies ChartConfig
  const bandConfig = Object.fromEntries(
    bandRows.map((row) => [row.band, { label: row.band.charAt(0).toUpperCase() + row.band.slice(1), color: bandColors[row.band] ?? "purple" }])
  ) as ChartConfig
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="card overflow-hidden p-5">
        <h3 className="font-medium">Edge evidence-tier coverage</h3>
        <p className="mt-1 text-xs text-muted-foreground">Pooled edges per evidence tier, read directly from the packet&apos;s recorded tier coverage.</p>
        <div className="mt-4">
          <BarChart className="chart" data={tierRows.length ? tierRows : [{ tier: "No edges", edges: 0 }]} config={tierConfig} bloom="low" animate={false}>
            <XAxis dataKey="tier" /><YAxis /><Tooltip labelKey="tier" /><Bar dataKey="edges" variant="hatched" />
          </BarChart>
        </div>
      </article>
      <article className="card overflow-hidden p-5">
        <h3 className="font-medium">Relationship band distribution</h3>
        <p className="mt-1 text-xs text-muted-foreground">People per strength band, read directly from the packet&apos;s recorded band distribution.</p>
        <div className="mt-4">
          <PieChart className="chart" data={bandRows.length ? bandRows : [{ band: "unknown", count: 0 }]} config={bandConfig} dataKey="count" nameKey="band" innerRadius={0.52} bloom="low" animate={false}>
            <Pie variant="dotted" /><Legend align="center" /><Tooltip labelKey="band" />
          </PieChart>
        </div>
      </article>
    </div>
  )
}
