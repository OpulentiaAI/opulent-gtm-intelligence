import { IntroLedger, RelationshipLedger } from "./network"
import { NetworkSourceDetail } from "./network-health"
import { Fold, JsonGrid, JsonValue, RecordCards } from "./primitives"
import { Timeline } from "./timeline"
import {
  evidenceItems,
  introLedger,
  networkHealth,
  packet,
  records,
  relationshipEdges,
  type RecordValue,
} from "@/lib/report"
import { deriveAgentExecutionTimeline, deriveWorkflowTimeline } from "@/lib/timelines"

/**
 * Audit layer: the complete provenance record, grouped into collapsed-by-
 * default details blocks. Nothing rendered before the two-layer restructure
 * is deleted — it is demoted into this region. Blocks expand on interaction
 * and are forced open for print by the PrintDetails utility.
 */
export function AuditLayer({ label }: { label: string }) {
  const dataHealth = (packet.data_health && typeof packet.data_health === "object" && !Array.isArray(packet.data_health)
    ? packet.data_health
    : {}) as RecordValue
  const sources = evidenceItems(packet)
  return (
    <section className="section" id="audit">
      <div className="measure mb-8">
        <p className="eyebrow mb-3">{label}</p>
        <h2 className="section-title">Audit &amp; provenance</h2>
        <p className="prose-copy mt-3">
          Complete execution provenance preserved for verification — nothing above is claimed without a record here.
        </p>
      </div>
      <div className="grid gap-3">
        <Fold summary="Agent execution timeline" hint="Observable stages derived only from packet records and receipts — execution provenance, not hidden chain-of-thought.">
          <Timeline steps={deriveAgentExecutionTimeline(packet)} />
        </Fold>
        <Fold summary="Workflow timeline" hint="The enforced resolve-to-delivery route; each gate is satisfied, proposed, blocked, or left not applicable per packet evidence.">
          <Timeline steps={deriveWorkflowTimeline(packet)} />
        </Fold>
        <Fold summary="Data health" hint="Identity resolution, coverage, duplicates, staleness, conflicts, and protected-field policy.">
          <JsonGrid value={dataHealth} />
        </Fold>
        <Fold summary="Relationship ledger" hint="The full edge list with bands, evidence tiers, and strength components exactly as scored in the packet.">
          <RelationshipLedger edges={relationshipEdges()} />
        </Fold>
        <Fold summary="Network source detail" hint="Member consent, the full per-source discovery table, and the graph-store manifest.">
          <NetworkSourceDetail health={networkHealth()} />
        </Fold>
        <Fold summary="Discovery scope" hint="Intake mode, funnel counts, identity keys, exclusions, and the Context call budget.">
          <JsonValue value={packet.discovery_scope || {}} />
        </Fold>
        <Fold summary="Scheduled applications" hint="Versioned triggers, budgets, review gates, metrics, and stop conditions; proposed stays proposed.">
          <RecordCards items={records(packet.applications)} empty="No applications recorded." />
        </Fold>
        <Fold summary="Context operations" hint="Natural-language job and exact API contract kept together; nothing is styled as executed without a receipt.">
          <RecordCards items={records(packet.context_operations)} empty="No Context operations recorded." />
        </Fold>
        <Fold summary="System updates" hint="Governed field diffs with policy, identifiers, and read-after-write verification.">
          <RecordCards items={records(packet.system_updates)} empty="No system updates recorded." />
        </Fold>
        <Fold summary="Intro ledger receipts" hint="Consent-gated introduction workflow with full stage receipts; a proposed or approved entry is never styled as sent.">
          <IntroLedger entries={introLedger()} />
        </Fold>
        <Fold summary="Source appendix" hint={`${sources.length} evidence reference(s) collected without changing packet provenance.`}>
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
        </Fold>
      </div>
    </section>
  )
}
