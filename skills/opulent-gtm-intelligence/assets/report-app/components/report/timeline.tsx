import type { TimelineState, TimelineStep } from "@/lib/timelines"

const stateLabel: Record<TimelineState, string> = {
  complete: "Complete",
  proposed: "Proposed",
  blocked: "Blocked",
  "not applicable": "Not applicable",
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="timeline" aria-label="Packet-derived timeline">
      {steps.map((step, index) => (
        <li className="timeline-step" key={step.key}>
          <div className="timeline-rail" aria-hidden="true">
            <span className={`timeline-dot timeline-dot-${step.state.replace(" ", "-")}`} />
          </div>
          <article className="card timeline-card">
            <div className="timeline-head">
              <div>
                <span className="eyebrow">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="timeline-title">{step.label}</h3>
              </div>
              <span className={`timeline-state timeline-state-${step.state.replace(" ", "-")}`}>
                {stateLabel[step.state]}
              </span>
            </div>
            <p className="prose-copy timeline-detail">{step.detail}</p>
            <p className="timeline-evidence">{step.evidence}</p>
          </article>
        </li>
      ))}
    </ol>
  )
}
