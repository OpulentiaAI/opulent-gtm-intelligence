import Link from "next/link"
import { notFound } from "next/navigation"
import { ConnectionCard } from "@/components/report/connections"
import { InteractionRollupCard, RelationshipLedger } from "@/components/report/network"
import { Fold, JsonGrid, Section } from "@/components/report/primitives"
import { WhatChanged } from "@/components/report/signals"
import { interactionRollup, objectValue, packet, records, relationshipEdges, slugify, targets, warmPaths } from "@/lib/report"

export const dynamicParams = false

export function generateStaticParams() {
  return targets().map((target) => ({ slug: slugify(String(target.name || "Unnamed")) }))
}

export default async function DossierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const target = targets().find((item) => slugify(String(item.name || "Unnamed")) === slug)
  if (!target) notFound()
  const name = String(target.name || "Unnamed")
  const relevantSignals = records(packet.signals).filter(
    (signal) =>
      signal.target === name ||
      (Array.isArray(signal.affected_people) &&
        signal.affected_people.some((person) =>
          typeof person === "string"
            ? person === name
            : Boolean(person && typeof person === "object" && !Array.isArray(person) && person.name === name)
        ))
  )
  const relevantRelationships = relationshipEdges().filter((edge) => edge.from === name || edge.to === name)
  const relevantPaths = warmPaths()
    .map((path, index) => ({ path, index }))
    .filter(({ path }) => path.target === name || path.target_company === name)
  const rollup = interactionRollup(target)
  const nextAction = objectValue(target.next_action)
  const who = target.role
    ? `${String(target.role)}${target.company ? ` at ${String(target.company)}` : ""}.`
    : [target.sector, target.geography].filter((value) => value != null && value !== "").map(String).join(", ")
  const headerProse = [
    who ? (who.endsWith(".") ? who : `${who}.`) : null,
    target.why_now ? String(target.why_now) : null,
    target.angle ? String(target.angle) : null,
  ]
    .filter(Boolean)
    .join(" ")
  let sectionNumber = 0
  const label = (text: string) => `${String(++sectionNumber).padStart(2, "0")} · ${text}`

  return (
    <main className="shell">
      <nav className="mb-16 border-b pb-4 text-xs text-muted-foreground"><Link href="/">← Intelligence overview</Link></nav>
      <header className="measure">
        <div className="mb-6 flex gap-2"><span className="pill">{String(target.target_kind)}</span><span className="pill">{String(target.confidence || "Unknown")}</span></div>
        <h1 className="display">{name}</h1>
        <p className="lede mt-8">{headerProse || "Enrichment dossier"}</p>
        <div className="mt-8 flex items-end gap-3"><strong className="metric">{String(target.fit_score || 0)}</strong><span className="pb-2 text-xs text-muted-foreground">FIT / 100</span></div>
      </header>

      {rollup && (
        <Section id="interactions" label={label("First-party history")} title="Where the relationship stands" description="Pooled-network interaction metadata for this person. A zero rollup is a valid, honest state; access then depends on network paths, not direct history.">
          <InteractionRollupCard rollup={rollup} />
        </Section>
      )}

      <Section id="warm-path" label={label("Warm access")} title="How to reach them" description="The recorded path in plain words; per-hop evidence sits one click deeper.">
        {relevantPaths.length ? (
          <div className="grid gap-4">
            {relevantPaths.map(({ path, index }) => (
              <ConnectionCard index={index} key={index} path={path} />
            ))}
          </div>
        ) : (
          <div className="card p-5 text-sm text-muted-foreground">No warm-path computation references this target; no familiarity is implied.</div>
        )}
      </Section>

      <Section id="action" label={label("Activation")} title="Do this next">
        <div className="card p-5">
          {nextAction ? (
            <p className="leading-relaxed">
              <strong className="font-medium">{String(nextAction.action || "Action not recorded")}.</strong>{" "}
              {String(nextAction.owner || "Owner not recorded")} owns this
              {nextAction.when ? `, due ${String(nextAction.when)}` : "; timing not recorded"}
              {target.why_now ? ` — ${String(target.why_now)}` : "."}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No next action is recorded for this target.</p>
          )}
        </div>
      </Section>

      <Section id="signals" label={label("Timing")} title="What changed">
        <WhatChanged signals={relevantSignals} />
      </Section>

      <Section id="record" label={label("Audit")} title="Complete record & provenance" description="The full enrichment record, relationship edges, and evidence for this target — collapsed, never discarded.">
        <div className="grid gap-3">
          <Fold summary="Complete record" hint="Every recorded enrichment field for this target.">
            <JsonGrid value={target} omit={["target_kind"]} />
          </Fold>
          <Fold summary="Relationship paths" hint="Edge bands and strength components exactly as scored in the packet.">
            <RelationshipLedger edges={relevantRelationships} />
          </Fold>
          <Fold summary="Evidence, risks & unknowns" hint="Target-level sources and open items.">
            <JsonGrid value={{ evidence: target.evidence || [], risks: target.risks || [], unknowns: target.unknowns || [] }} />
          </Fold>
        </div>
      </Section>
    </main>
  )
}
