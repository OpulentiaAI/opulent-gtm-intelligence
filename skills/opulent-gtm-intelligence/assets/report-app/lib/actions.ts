import {
  introLedger,
  objectValue,
  packet,
  records,
  warmPaths,
  type RecordValue,
} from "./report"

export type ActionItem = {
  owner: string
  action: string
  when: string
  why: string
  context: string
}

function fromNextAction(record: RecordValue, why: string, context: string): ActionItem | null {
  const next = objectValue(record.next_action)
  if (!next) return null
  return {
    owner: String(next.owner || "Owner not recorded"),
    action: String(next.action || "Action not recorded"),
    when: String(next.when || ""),
    why,
    context,
  }
}

/**
 * Deterministic action queue composed from existing packet fields only:
 * every next_action on accounts, people, and warm paths, plus pending
 * introduction-ledger entries. Sorted by date ascending (undated last)
 * and de-duplicated on identical owner + action.
 */
export function actionQueue(): ActionItem[] {
  const items: ActionItem[] = []
  for (const account of records(packet.accounts)) {
    const item = fromNextAction(account, String(account.why_now || account.angle || ""), String(account.name || "Account"))
    if (item) items.push(item)
  }
  for (const person of records(packet.people)) {
    const item = fromNextAction(person, String(person.why_now || person.angle || ""), String(person.name || "Person"))
    if (item) items.push(item)
  }
  const paths = warmPaths()
  paths.forEach((path, index) => {
    const target = String(path.target || `target ${index + 1}`)
    const item = fromNextAction(path as RecordValue, String(path.objective || ""), `Path to ${target}`)
    if (item) items.push(item)
  })
  for (const entry of introLedger()) {
    const status = String(entry.status || "")
    if (status !== "proposed" && status !== "connector_approved") continue
    const connector = String(entry.connector || "the connector")
    const target = String(entry.target || "the target")
    const linkedPath = typeof entry.warm_path_ref === "number" ? paths[entry.warm_path_ref] : undefined
    const consent = objectValue(entry.consent)
    items.push({
      owner: String(entry.requester || "Owner not recorded"),
      action: `Get ${connector}'s approval and let them send the introduction to ${target} — drafted, not sent`,
      when: String(consent?.date || ""),
      why: String(linkedPath?.objective || packet.objective || ""),
      context: `Introduction to ${target}`,
    })
  }
  const deduplicated = new Map<string, ActionItem>()
  for (const item of items) {
    const key = `${item.owner}::${item.action}`
    if (!deduplicated.has(key)) deduplicated.set(key, item)
  }
  return [...deduplicated.values()].sort((a, b) => {
    if (!a.when && !b.when) return 0
    if (!a.when) return 1
    if (!b.when) return -1
    return a.when < b.when ? -1 : a.when > b.when ? 1 : 0
  })
}
