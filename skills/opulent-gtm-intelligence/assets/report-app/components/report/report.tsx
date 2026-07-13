import Link from "next/link"
import { Analytics } from "./analytics"
import { JsonGrid, JsonValue, RecordCards, Section } from "./primitives"
import { evidenceItems, numberValue, packet, records, slugify, strings, targets } from "@/lib/report"

const reportTargets = targets()
const signals = records(packet.signals)
const relationships = records(packet.relationships)
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
  return (
    <main className="shell">
      <nav className="mb-16 flex items-center justify-between border-b pb-4 text-xs text-muted-foreground">
        <span className="eyebrow">Opulent intelligence</span>
        <div className="flex gap-4"><a href="#analysis">Analysis</a><a href="#targets">Targets</a><a href="#sources">Sources</a></div>
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

      <Section id="health" label="03 · Foundation" title="Data health">
        <div className="card p-5"><JsonGrid value={dataHealth} /></div>
      </Section>

      <Section id="targets" label="04 · Priority queue" title="Accounts & people" description="Every target links to its statically exported enrichment dossier.">
        <TargetCards />
      </Section>

      <Section id="relationships" label="05 · Routes" title="Relationship intelligence"><RecordCards items={relationships} empty="No verified relationship edges recorded." /></Section>
      <Section id="signals" label="06 · Change ledger" title="Signals"><RecordCards items={signals} empty="No signals recorded." /></Section>
      <Section id="examples" label="07 · Public proof" title="Public examples"><RecordCards items={records(packet.public_examples)} empty="No public examples recorded." /></Section>
      <Section id="conversations" label="08 · Activation" title="Conversation kits"><RecordCards items={records(packet.conversation_kits)} empty="No conversation kits recorded." /></Section>
      <Section id="competitors" label="09 · Market" title="Competitors"><RecordCards items={records(packet.competitors)} empty="No competitors recorded." /></Section>

      <Section id="unknowns" label="10 · Open questions" title="Unknowns">
        <div className="card p-5"><JsonValue value={packet.unknowns || []} /></div>
      </Section>

      <Section id="applications" label="11 · Operating system" title="Scheduled GTM applications"><RecordCards items={records(packet.applications)} empty="No applications recorded." /></Section>

      <Section id="discovery" label="12 · Intake" title="Discovery scope">
        <div className="card p-5"><JsonValue value={packet.discovery_scope || {}} /></div>
      </Section>

      <Section id="context" label="13 · Execution contract" title="Context operations" description="Natural-language job and exact API contract remain visible together.">
        <RecordCards items={records(packet.context_operations)} empty="No Context operations recorded." />
      </Section>

      <Section id="updates" label="14 · Governed mutations" title="System updates"><RecordCards items={records(packet.system_updates)} empty="No system updates recorded." /></Section>

      <Section id="sources" label="15 · Audit" title="Source appendix" description={`${sources.length} evidence references collected without changing packet provenance.`}>
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
