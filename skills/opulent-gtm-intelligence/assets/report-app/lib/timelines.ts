import { evidenceItems, numberValue, records, type Json, type Packet, type RecordValue } from "./report"

export type TimelineState = "complete" | "proposed" | "blocked" | "not applicable"

export type TimelineStep = {
  key: string
  label: string
  detail: string
  evidence: string
  state: TimelineState
}

function object(value: Json | undefined): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null
}

function contains(value: Json | undefined, term: string): boolean {
  if (typeof value === "string") return value.toLowerCase().includes(term)
  if (Array.isArray(value)) return value.some((item) => contains(item, term))
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, item]) => key.toLowerCase().includes(term) || contains(item, term))
  }
  return false
}

function hasReceipt(receipt: Json | undefined): boolean {
  const value = object(receipt)
  if (!value || !value.verification) return false
  return ["request_id", "monitor_id", "run_id", "change_id"].some((key) => Boolean(value[key]))
}

function contextState(operations: RecordValue[]): TimelineState {
  if (!operations.length) return "not applicable"
  if (operations.some((operation) => ["blocked", "failed"].includes(String(operation.status)))) return "blocked"
  if (operations.some((operation) => operation.status === "executed" && !hasReceipt(operation.receipt))) return "blocked"
  if (operations.some((operation) => operation.status === "proposed")) return "proposed"
  if (operations.every((operation) => operation.status === "executed" && hasReceipt(operation.receipt))) return "complete"
  return "proposed"
}

function contextCounts(operations: RecordValue[]): string {
  const executed = operations.filter((operation) => operation.status === "executed" && hasReceipt(operation.receipt)).length
  const proposed = operations.filter((operation) => operation.status === "proposed").length
  const blocked = operations.filter(
    (operation) =>
      ["blocked", "failed"].includes(String(operation.status)) ||
      (operation.status === "executed" && !hasReceipt(operation.receipt))
  ).length
  return `${executed} executed · ${proposed} proposed · ${blocked} blocked`
}

function updateState(updates: RecordValue[]): TimelineState {
  if (!updates.length) return "not applicable"
  if (updates.some((update) => update.result === "blocked")) return "blocked"
  const verified = updates.filter(
    (update) => update.result === "verified" && update.identifier && update.verification
  ).length
  if (verified === updates.length) return "complete"
  return "proposed"
}

function updateCounts(updates: RecordValue[]): string {
  const verified = updates.filter(
    (update) => update.result === "verified" && update.identifier && update.verification
  ).length
  const proposed = updates.filter((update) => ["drafted", "needs review", "skipped"].includes(String(update.result))).length
  const blocked = updates.filter((update) => update.result === "blocked").length
  return `${verified} verified · ${proposed} pending · ${blocked} blocked`
}

function applicationState(applications: RecordValue[]): TimelineState {
  if (!applications.length) return "not applicable"
  if (applications.some((application) => application.status === "blocked")) return "blocked"
  if (
    applications.every((application) => {
      const lastRun = object(application.last_run)
      return application.status === "active" && application.identifier && lastRun?.run_id && lastRun.result
    })
  ) return "complete"
  return "proposed"
}

function activationState(updates: RecordValue[], applications: RecordValue[], hasConversationKits = false): TimelineState {
  const updateStatus = updateState(updates)
  const appStatus = applicationState(applications)
  if (updateStatus === "blocked" || appStatus === "blocked") return "blocked"
  if (updateStatus === "proposed" || appStatus === "proposed" || hasConversationKits) return "proposed"
  if (updateStatus === "complete" || appStatus === "complete") return "complete"
  return "not applicable"
}

function activationCounts(updates: RecordValue[], applications: RecordValue[]): string {
  const active = applications.filter((application) => application.status === "active").length
  const proposed = applications.filter((application) => application.status === "proposed").length
  return `${updateCounts(updates)} · ${active} active apps · ${proposed} proposed apps`
}

function actualBrowserEvidence(packet: Packet): number {
  return evidenceItems(packet).filter(
    (item) =>
      contains(item.tool, "browser") ||
      contains(item.source_kind, "browser") ||
      contains(item.route, "browser") ||
      Boolean(item.session_id || item.screenshot_id)
  ).length
}

function explicitCorroborationEvidence(packet: Packet): number {
  return evidenceItems(packet).filter(
    (item) =>
      contains(item.note, "corroborat") ||
      contains(item.source_kind, "corroborat") ||
      contains(item.tool, "corroborat")
  ).length
}

function plannedStep(packet: Packet, term: string): boolean {
  return [...records(packet.applications), ...records(packet.context_operations)].some((item) => contains(item, term))
}

export function deriveAgentExecutionTimeline(packet: Packet): TimelineStep[] {
  const scope = object(packet.discovery_scope)
  const targets = [...records(packet.accounts), ...records(packet.people)]
  const targetEvidence = targets.reduce((total, target) => total + records(target.evidence).length, 0)
  const operations = records(packet.context_operations)
  const signals = records(packet.signals)
  const relationships = records(packet.relationships)
  const scored = targets.filter((target) => typeof target.fit_score === "number").length
  const updates = records(packet.system_updates)
  const applications = records(packet.applications)
  const conversationKits = records(packet.conversation_kits)
  const corroborated = explicitCorroborationEvidence(packet)
  const corroborationPlanned = plannedStep(packet, "corroborat")
  const activationStatus = activationState(updates, applications, Boolean(conversationKits.length))

  return [
    {
      key: "intake",
      label: "Intake & scope",
      detail: scope
        ? `${String(scope.mode || "Unspecified")} intake with ${numberValue(scope.eligible_count)} eligible of ${numberValue(scope.requested_count)} requested.`
        : "No discovery scope is present in the packet.",
      evidence: scope ? "discovery_scope" : "No scope record",
      state: scope ? "complete" : "not applicable",
    },
    {
      key: "identity",
      label: "Identity resolution & research",
      detail: targets.length
        ? `${targets.length} target records carry ${targetEvidence} direct evidence item(s).`
        : "No account or person records are present.",
      evidence: scope && Array.isArray(scope.identity_keys)
        ? `${scope.identity_keys.length} declared identity key(s)`
        : `${targetEvidence} target evidence item(s)`,
      state: targets.length && targetEvidence >= targets.length ? "complete" : targets.length ? "proposed" : "not applicable",
    },
    {
      key: "context",
      label: "Context execution",
      detail: operations.length
        ? "Executed status counts only when its receipt includes an execution identifier and verification."
        : "No Context operation is recorded.",
      evidence: operations.length ? contextCounts(operations) : "No Context ledger entries",
      state: contextState(operations),
    },
    {
      key: "corroboration",
      label: "Evidence corroboration",
      detail: corroborated
        ? `${corroborated} evidence item(s) explicitly identify corroboration.`
        : corroborationPlanned
          ? "Corroboration appears in a proposed route or application step; completion is not claimed."
          : "No explicit corroboration marker is present.",
      evidence: corroborated ? `${corroborated} explicit evidence marker(s)` : corroborationPlanned ? "Planned route only" : "No packet proof",
      state: corroborated ? "complete" : corroborationPlanned ? "proposed" : "not applicable",
    },
    {
      key: "analysis",
      label: "Signal & relationship analysis",
      detail: `${signals.length} signal(s) and ${relationships.length} relationship edge(s) are recorded.`,
      evidence: `${signals.length} signals · ${relationships.length} edges`,
      state: signals.length || relationships.length ? "complete" : targets.length ? "proposed" : "not applicable",
    },
    {
      key: "scoring",
      label: "Scoring & prioritization",
      detail: scored ? `${scored} of ${targets.length} targets have packet fit scores.` : "No target fit scores are recorded.",
      evidence: `${scored}/${targets.length} targets scored`,
      state: targets.length && scored === targets.length ? "complete" : targets.length ? "proposed" : "not applicable",
    },
    {
      key: "activation",
      label: "Activation & system updates",
      detail: updates.length
        ? "Verified writes require result, returned identifier, and read-after-write verification."
        : applications.length
          ? `${applications.length} application contract(s) are present without a system update.`
          : "No activation or system update is recorded.",
      evidence: activationCounts(updates, applications),
      state: activationStatus,
    },
    {
      key: "validation",
      label: "Artifact validation",
      detail: "Build and browser checks are outside the packet schema, so this provenance view does not claim they ran.",
      evidence: "No packet validation receipt field",
      state: "not applicable",
    },
  ]
}

export function deriveWorkflowTimeline(packet: Packet): TimelineStep[] {
  const scope = object(packet.discovery_scope)
  const targets = [...records(packet.accounts), ...records(packet.people)]
  const operations = records(packet.context_operations)
  const extractOperations = operations.filter((operation) => contains(operation.endpoint, "/web/extract"))
  const browserEvidence = actualBrowserEvidence(packet)
  const corroborated = explicitCorroborationEvidence(packet)
  const signals = records(packet.signals)
  const relationships = records(packet.relationships)
  const updates = records(packet.system_updates)
  const applications = records(packet.applications)
  const verifiedUpdates = updates.filter(
    (update) => update.result === "verified" && update.identifier && update.verification
  ).length

  return [
    {
      key: "resolve",
      label: "Resolve",
      detail: "Gate: declare canonical identity keys and retain evidence for selected people and companies.",
      evidence: scope && Array.isArray(scope.identity_keys)
        ? `${scope.identity_keys.length} identity key(s) · ${targets.length} targets`
        : `${targets.length} target record(s)`,
      state: scope && Array.isArray(scope.identity_keys) && targets.length && targets.every((target) => target.confidence === "Verified" && records(target.evidence).length)
        ? "complete"
        : targets.length ? "proposed" : "not applicable",
    },
    {
      key: "discover",
      label: "Search / discover",
      detail: "Gate: bound the intake and show the candidate-to-eligible funnel before enrichment.",
      evidence: scope
        ? `${numberValue(scope.candidate_count)} candidates → ${numberValue(scope.eligible_count)} eligible`
        : "No discovery scope",
      state: scope ? "complete" : "not applicable",
    },
    {
      key: "extract",
      label: "Extract",
      detail: "Gate: structured Context extraction is complete only with executed status and a verified receipt.",
      evidence: extractOperations.length ? contextCounts(extractOperations) : "No /web/extract operation",
      state: contextState(extractOperations),
    },
    {
      key: "corroborate",
      label: "Corroborate",
      detail: "Gate: action-driving claims need an explicit corroboration marker; a planned route is not completion.",
      evidence: corroborated ? `${corroborated} explicit evidence marker(s)` : plannedStep(packet, "corroborat") ? "Planned route only" : "No packet proof",
      state: corroborated ? "complete" : plannedStep(packet, "corroborat") ? "proposed" : "not applicable",
    },
    {
      key: "browser",
      label: "Browser fallback",
      detail: "Gate: use only for rendered, protected, authenticated, or interaction-heavy evidence.",
      evidence: browserEvidence ? `${browserEvidence} browser evidence item(s)` : "No browser evidence; fallback not claimed",
      state: browserEvidence ? "complete" : "not applicable",
    },
    {
      key: "analyze",
      label: "Analyze",
      detail: "Gate: preserve scored deltas, relationship context, and evidence-backed prioritization.",
      evidence: `${signals.length} signals · ${relationships.length} edges · ${targets.length} targets`,
      state: signals.length || relationships.length || targets.some((target) => typeof target.fit_score === "number") ? "complete" : "not applicable",
    },
    {
      key: "activate",
      label: "Activate",
      detail: "Gate: proposed applications and drafts remain proposed; verified writes require receipts.",
      evidence: activationCounts(updates, applications),
      state: activationState(updates, applications),
    },
    {
      key: "verify",
      label: "Verify / deliver",
      detail: verifiedUpdates
        ? `${verifiedUpdates} system write(s) have read-after-write verification; report delivery itself has no packet receipt.`
        : "No packet field proves report build, browser inspection, or delivery.",
      evidence: verifiedUpdates ? `${verifiedUpdates} verified system receipt(s); delivery unproven` : "No delivery receipt field",
      state: plannedStep(packet, "verify") || verifiedUpdates ? "proposed" : "not applicable",
    },
  ]
}
