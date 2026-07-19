import Link from "next/link"
import { Analytics } from "./analytics"
import { NetworkHealthSection } from "./network-health"
import { IntroLedger, RelationshipLedger, WarmPaths } from "./network"
import { JsonGrid, JsonValue, RecordCards, Section } from "./primitives"
import { Timeline } from "./timeline"
import {
  evidenceItems,
  interactionRollup,
  introLedger,
  networkHealth,
  numberValue,
  packet,
  records,
  relationshipEdges,
  slugify,
  strings,
  targets,
  warmPaths,
} from "@/lib/report"
import { deriveAgentExecutionTimeline, deriveWorkflowTimeline } from "@/lib/timelines"

const reportTargets = targets()
const signals = records(packet.signals)
const relationships = relationshipEdges()
const dataHealth = (packet.data_health && typeof packet.data_health === "object" && !Array.isArray(packet.data_health) ? packet.data_health : {})

function TargetCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {reportTargets.sort((a, b) => numberValue(b.fit_score) - numberValue(a.fit_score)).map((target) => {
        const name = String(target.name || "Unnamed")
        const evidenceCount = records(target.evidence).length
        const signalCount = signals.filter((signal) => signal.target === name).length
        const pathCount = relationships.filter((edge) => edge.from === name || edge.to === name).length
        return (
          <Link className="card dossier-link block p-5" href={`/dossiers/${slugify(name)}`} key={`${target.target_kind}-${name}`}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="eyebrow mb-2">{String(target.target_kind)}</p><h3 className="text-xl font-medium tracking-tight">{name}</h3></div>
              <div className="text-right"><div className="metric">{numberValue(target.fit_score)}</div><p className="text-[10px] text-muted-foreground">FIT / 100</p></div>
            </div>
            <p className="prose-copy mt-5 text-sm">{String(target.why_now || "No timing rationale recorded.")}</p>
            {(() => {
              const rollup = interactionRollup(target)
              return rollup ? (
                <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                  First-party contact · {numberValue(rollup.interactions_12mo)} interaction(s) in 12 mo · {numberValue(rollup.meetings)} meeting(s) · reciprocity {numberValue(rollup.reciprocity_score)}/10
                </p>
              ) : null
            })()}
            <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4 text-center text-xs">
              <div><strong className="block text-base">{evidenceCount}</strong><span className="text-muted-foreground">sources</span></div>
              <div><strong className="block text-base">{signalCount}</strong><span className="text-muted-foreground">signals</span></div>
              <div><strong className="block text-base">{pathCount}</strong><span className="text-muted-foreground">paths</span></div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Rating explanation: packet fit score, supported by {evidenceCount} target evidence item(s), {signalCount} linked signal(s), and {pathCount} relationship edge(s). Confidence: {String(target.confidence || "Unknown")}.</p>
          </Link>
        )
      })}
    </div>
  )
}

export function Report() {
  const sources = evidenceItems(packet)
  const executionTimeline = deriveAgentExecutionTimeline(packet)
  const workflowTimeline = deriveWorkflowTimeline(packet)
  return (
    <main className="shell">
      <nav className="mb-16 flex flex-wrap items-center justify-between gap-4 border-b pb-4 text-xs text-muted-foreground">
        <span className="eyebrow">Opulent intelligence</span>
        <div className="flex flex-wrap gap-x-4 gap-y-2"><a href="#analysis">Analysis</a><a href="#execution">Execution</a><a href="#workflow">Workflow</a><a href="#network">Network</a><a href="#warm-paths">Warm paths</a><a href="#intro-ledger">Intros</a><a href="#targets">Targets</a><a href="#sources">Sources</a></div>
      </nav>
      <header className="measure">
        <div className="mb-6 flex flex-wrap gap-2"><span className="pill">{packet.mode}</span><span className="pill">{packet.generated_at}</span></div>
        <h1 className="display">{packet.client}</h1>
        <p className="lede mt-8">{packet.objective}</p>
      </header>

      <Section id="changes" label="01 · Decision brief" title="What matters now" description="Executive interpretation preserved directly from the validated packet.">
        <ol className="grid gap-3">
          {strings(packet.executive_brief).map((item, index) => <li className="card flex gap-5 p-5" key={index}><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span><p className="leading-relaxed">{item}</p></li>)}
        </ol>
      </Section>

      <Section id="analysis" label="02 · Dither Kit" title="Analysis & Statistics" description="Deterministic views of packet ratings, signal components, confidence, and data health. Charts use committed Dither Kit source components.">
        <Analytics targets={reportTargets} signals={signals} dataHealth={dataHealth} />
      </Section>

      <Section id="execution" label="03 · Execution provenance" title="Agent execution timeline" description="Observable stages derived only from packet records and receipts. This is execution provenance, not hidden chain-of-thought.">
        <Timeline steps={executionTimeline} />
      </Section>

      <Section id="workflow" label="04 · Enforced route" title="Workflow timeline" description="The required resolve-to-delivery route, with each gate satisfied, proposed, blocked, or left not applicable according to packet evidence.">
        <Timeline steps={workflowTimeline} />
      </Section>

      <Section id="network" label="05 · Pooled graph" title="Network health" description="Coverage of the consented first-party network and per-source discovery. Missing or unauthenticated sources are reported as-is; no ingestion is implied for them.">
        <NetworkHealthSection health={networkHealth()} />
      </Section>

      <Section id="warm-paths" label="06 · Verified access" title="Warm paths" description="Activation routes computed only from verified pooled-network edges. Targets without a verified path are reported explicitly rather than hidden.">
        <WarmPaths paths={warmPaths()} />
      </Section>

      <Section id="intro-ledger" label="07 · Consent ledger" title="Intro ledger" description="Consent-gated introduction workflow with stage receipts. A proposed or connector-approved entry is not a sent introduction; only sent or completed reads as done.">
        <IntroLedger entries={introLedger()} />
      </Section>

      <Section id="health" label="08 · Foundation" title="Data health">
        <div className="card p-5"><JsonGrid value={dataHealth} /></div>
      </Section>

      <Section id="targets" label="09 · Priority queue" title="Accounts & people" description="Every target links to its statically exported enrichment dossier.">
        <TargetCards />
      </Section>

      <Section id="relationships" label="10 · Routes" title="Relationship intelligence" description="Edge bands and strength components are shown exactly as scored in the packet."><RelationshipLedger edges={relationships} /></Section>
      <Section id="signals" label="11 · Change ledger" title="Signals"><RecordCards items={signals} empty="No signals recorded." /></Section>
      <Section id="examples" label="12 · Public proof" title="Public examples"><RecordCards items={records(packet.public_examples)} empty="No public examples recorded." /></Section>
      <Section id="conversations" label="13 · Activation" title="Conversation kits"><RecordCards items={records(packet.conversation_kits)} empty="No conversation kits recorded." /></Section>
      <Section id="competitors" label="14 · Market" title="Competitors"><RecordCards items={records(packet.competitors)} empty="No competitors recorded." /></Section>

      <Section id="unknowns" label="15 · Open questions" title="Unknowns">
        <div className="card p-5"><JsonValue value={packet.unknowns || []} /></div>
      </Section>

      <Section id="applications" label="16 · Operating system" title="Scheduled GTM applications"><RecordCards items={records(packet.applications)} empty="No applications recorded." /></Section>

      <Section id="discovery" label="17 · Intake" title="Discovery scope">
        <div className="card p-5"><JsonValue value={packet.discovery_scope || {}} /></div>
      </Section>

      <Section id="context" label="18 · Execution contract" title="Context operations" description="Natural-language job and exact API contract remain visible together.">
        <RecordCards items={records(packet.context_operations)} empty="No Context operations recorded." />
      </Section>

      <Section id="updates" label="19 · Governed mutations" title="System updates"><RecordCards items={records(packet.system_updates)} empty="No system updates recorded." /></Section>

      <Section id="sources" label="20 · Audit" title="Source appendix" description={`${sources.length} evidence references collected without changing packet provenance.`}>
        <div className="card divide-y">
          {sources.map((source, index) => (
            <div className="grid gap-2 p-4 text-sm md:grid-cols-[3rem_1fr_1fr]" key={index}>
              <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              <JsonValue value={source.url || source.file_path || source.thread_id || source.app_id || "Evidence"} />
              <span className="text-xs text-muted-foreground">{source.packet_path}{source.date ? ` · ${source.date}` : ""}</span>
            </div>
          ))}
          {!sources.length && <p className="p-5 text-sm text-muted-foreground">No sources recorded.</p>}
        </div>
      </Section>
    </main>
  )
}
