import Link from "next/link"
import { Analytics } from "./analytics"
import { AuditLayer } from "./audit"
import { Connections } from "./connections"
import { NetworkDashboards } from "./network-health"
import { JsonValue, NarrativeCards, Section } from "./primitives"
import { WhatChanged } from "./signals"
import { actionQueue, type ActionItem } from "@/lib/actions"
import {
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

const reportTargets = targets()
const signals = records(packet.signals)
const relationships = relationshipEdges()
const dataHealth = (packet.data_health && typeof packet.data_health === "object" && !Array.isArray(packet.data_health) ? packet.data_health : {})

function ActionQueue({ items }: { items: ActionItem[] }) {
  if (!items.length) {
    return <div className="card p-5 text-sm text-muted-foreground">No next actions are recorded in this packet.</div>
  }
  return (
    <ol className="grid gap-3">
      {items.map((item, index) => (
        <li className="card flex gap-5 p-5" key={index}>
          <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <p className="leading-relaxed">
              <strong className="font-medium">{item.action}.</strong>{" "}
              {item.owner} owns this{item.when ? `, due ${item.when}` : "; timing not recorded"}
              {item.why ? ` — ${item.why}` : "."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{item.context}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

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
  const unknownList = Array.isArray(packet.unknowns) ? packet.unknowns : []
  const unknownRecords = records(packet.unknowns)
  return (
    <main className="shell">
      <nav className="mb-16 flex flex-wrap items-center justify-between gap-4 border-b pb-4 text-xs text-muted-foreground">
        <span className="eyebrow">Opulent intelligence</span>
        <div className="flex flex-wrap gap-x-4 gap-y-2"><a href="#actions">Actions</a><a href="#connections">Connections</a><a href="#targets">Targets</a><a href="#changes">Changes</a><a href="#dashboards">Dashboards</a><a href="#audit">Audit</a></div>
      </nav>
      <header className="measure">
        <div className="mb-6 flex flex-wrap gap-2"><span className="pill">{packet.mode}</span><span className="pill">{packet.generated_at}</span></div>
        <h1 className="display">{packet.client}</h1>
        <p className="lede mt-8">{packet.objective}</p>
      </header>

      <Section id="brief" label="01 · Decision brief" title="What matters now" description="Executive interpretation preserved directly from the validated packet.">
        <ol className="grid gap-3">
          {strings(packet.executive_brief).map((item, index) => <li className="card flex gap-5 p-5" key={index}><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span><p className="leading-relaxed">{item}</p></li>)}
        </ol>
      </Section>

      <Section id="actions" label="02 · Action queue" title="Do this next" description="Every recorded next step, in date order, with its owner and a one-clause why. Composed only from the packet's recorded actions and pending introductions.">
        <ActionQueue items={actionQueue()} />
      </Section>

      <Section id="connections" label="03 · Warm access" title="Connections" description="Who can open each door, in plain sentences. Targets without a verified path are stated outright; per-hop evidence and scoring sit one click deeper.">
        <Connections intros={introLedger()} paths={warmPaths()} />
      </Section>

      <Section id="targets" label="04 · Priority queue" title="Priority targets" description="Ranked accounts and people. Every target links to its statically exported dossier.">
        <TargetCards />
      </Section>

      <Section id="changes" label="05 · Change ledger" title="What changed" description="Each routed signal as a before-and-after story with its conversation implication. Score components, dates, and expiry sit in per-signal details.">
        <WhatChanged signals={signals} />
      </Section>

      <Section id="proof" label="06 · Public proof" title="Proof you can use">
        <NarrativeCards
          detailsSummary="Evidence"
          empty="No public examples recorded."
          items={records(packet.public_examples)}
          labels={{ demonstration_value: "What it demonstrates" }}
          lead={["demonstration_value"]}
        />
      </Section>

      <Section id="conversations" label="07 · Activation" title="Conversation kits">
        <NarrativeCards
          empty="No conversation kits recorded."
          items={records(packet.conversation_kits)}
          labels={{ cta: "Call to action", objection_response: "If they push back" }}
          lead={["context", "hypothesis", "proof", "questions", "objection_response", "cta"]}
        />
      </Section>

      <Section id="competitors" label="08 · Market" title="Competitive view">
        <NarrativeCards
          detailsSummary="Evidence"
          empty="No competitors recorded."
          items={records(packet.competitors)}
          labels={{ where_client_wins: "Where we win", where_client_loses: "Where we lose", reframe: "Reframe the comparison" }}
          lead={["where_client_wins", "where_client_loses", "reframe"]}
        />
      </Section>

      <Section id="unknowns" label="09 · Open questions" title="Open questions" description="Unknowns stated without apology; each carries its impact and how to resolve it.">
        {unknownRecords.length === unknownList.length ? (
          <NarrativeCards
            empty="No open questions recorded."
            items={unknownRecords}
            labels={{ verification_task: "How to resolve" }}
            lead={["impact", "verification_task"]}
          />
        ) : (
          <div className="card p-5"><JsonValue value={packet.unknowns || []} /></div>
        )}
      </Section>

      <Section id="dashboards" label="10 · Analysis & statistics" title="Dashboards" description="Deterministic Dither Kit views of ratings, signal components, confidence, data health, and the pooled first-party network.">
        <div className="grid gap-4">
          <Analytics dataHealth={dataHealth} signals={signals} targets={reportTargets} />
          <NetworkDashboards health={networkHealth()} />
        </div>
      </Section>

      <AuditLayer label="11 · Provenance" />
    </main>
  )
}
