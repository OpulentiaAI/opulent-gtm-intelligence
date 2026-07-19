import Link from "next/link"
import { notFound } from "next/navigation"
import { InteractionRollupCard, RelationshipLedger } from "@/components/report/network"
import { JsonGrid, RecordCards, Section } from "@/components/report/primitives"
import { interactionRollup, packet, records, relationshipEdges, slugify, targets } from "@/lib/report"

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
  const rollup = interactionRollup(target)
  let sectionNumber = 0
  const label = (text: string) => `${String(++sectionNumber).padStart(2, "0")} · ${text}`

  return (
    <main className="shell">
      <nav className="mb-16 border-b pb-4 text-xs text-muted-foreground"><Link href="/">← Intelligence overview</Link></nav>
      <header className="measure">
        <div className="mb-6 flex gap-2"><span className="pill">{String(target.target_kind)}</span><span className="pill">{String(target.confidence || "Unknown")}</span></div>
        <h1 className="display">{name}</h1>
        <p className="lede mt-8">{String(target.why_now || target.angle || "Enrichment dossier")}</p>
        <div className="mt-8 flex items-end gap-3"><strong className="metric">{String(target.fit_score || 0)}</strong><span className="pb-2 text-xs text-muted-foreground">FIT / 100</span></div>
      </header>

      <Section id="enrichment" label={label("Complete record")} title="Enrichment">
        <div className="card p-5"><JsonGrid value={target} omit={["target_kind"]} /></div>
      </Section>
      {rollup && (
        <Section id="interactions" label={label("First-party contact")} title="Interaction rollup" description="Pooled-network interaction metadata for this person. A zero rollup is a valid, honest state; access then depends on network paths, not direct history.">
          <InteractionRollupCard rollup={rollup} />
        </Section>
      )}
      <Section id="signals" label={label("Timing")} title="Relevant signals"><RecordCards items={relevantSignals} empty="No target-specific signals recorded." /></Section>
      <Section id="relationships" label={label("Access")} title="Relationship paths"><RelationshipLedger edges={relevantRelationships} /></Section>
      <Section id="action" label={label("Activation")} title="Next action">
        <div className="card p-5"><JsonGrid value={(target.next_action && typeof target.next_action === "object" && !Array.isArray(target.next_action) ? target.next_action : {})} /></div>
      </Section>
      <Section id="evidence" label={label("Audit")} title="Evidence">
        <div className="card p-5"><JsonGrid value={{ evidence: target.evidence || [], risks: target.risks || [], unknowns: target.unknowns || [] }} /></div>
      </Section>
    </main>
  )
}
