import { Fold, JsonGrid, plainLabel } from "./primitives"
import type { RecordValue } from "@/lib/report"

const prominentKeys = [
  "title",
  "target",
  "previous_state",
  "current_state",
  "why_it_changes_the_call",
  "conversation_angle",
  "confidence",
]

/**
 * Decision-layer signal narrative: title, plain before/after sentence, and the
 * conversation implication stay expanded; the six score components, dates,
 * expiry, and every other recorded field remain inside a collapsed details
 * block per signal.
 */
export function WhatChanged({ signals }: { signals: RecordValue[] }) {
  if (!signals.length) return <div className="card p-5 text-sm text-muted-foreground">No signals recorded.</div>
  return (
    <div className="grid gap-4">
      {signals.map((signal, index) => (
        <article className="card p-5" key={index}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow mb-2">{String(signal.target || "Unattributed")}</p>
              <h3 className="text-lg font-medium tracking-tight">
                {String(signal.title || plainLabel(String(signal.type || "Signal")))}
              </h3>
            </div>
            {signal.confidence != null && signal.confidence !== "" && <span className="pill">{String(signal.confidence)}</span>}
          </div>
          <p className="mt-3 leading-relaxed">
            Before: {String(signal.previous_state || "not recorded")}. Now: {String(signal.current_state || "not recorded")}.
          </p>
          {signal.why_it_changes_the_call != null && signal.why_it_changes_the_call !== "" && (
            <p className="mt-3 text-sm">
              <strong className="font-medium">Why it changes the call.</strong> {String(signal.why_it_changes_the_call)}
            </p>
          )}
          {signal.conversation_angle != null && signal.conversation_angle !== "" && (
            <p className="mt-2 text-sm">
              <strong className="font-medium">Conversation angle.</strong> {String(signal.conversation_angle)}
            </p>
          )}
          <Fold summary="Scoring, dates & full record" tone="inline">
            <JsonGrid value={signal} omit={prominentKeys} />
          </Fold>
        </article>
      ))}
    </div>
  )
}
