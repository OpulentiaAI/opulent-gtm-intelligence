import packetData from "@/data/packet.json"

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type RecordValue = { [key: string]: Json }

export type StrengthComponents = RecordValue & {
  evidence_quality?: number
  recency?: number
  relevance?: number
  access?: number
  reciprocity?: number
}

export type RelationshipEdge = RecordValue & {
  from?: string
  to?: string
  type?: string
  via?: string
  strength?: number
  band?: string
  evidence_tier?: string
  owner?: string
  confidence?: string
  last_verified?: string
  activation_path?: string
  risk?: string
  strength_components?: StrengthComponents
}

export type NetworkMember = RecordValue & {
  name?: string
  role?: string
  consent?: boolean
  sources_connected?: string[]
}

export type NetworkSource = RecordValue & {
  source?: string
  status?: string
  ingested?: boolean
  interactions_ingested?: number
  cursor?: string
  note?: string
  blocked_read?: string
}

export type StoreManifest = RecordValue & {
  schema_version?: string
  path?: string
  last_run_at?: string
  runs?: number
}

export type NetworkHealth = RecordValue & {
  metadata_only?: boolean
  window_start?: string
  window_end?: string
  members?: NetworkMember[]
  sources?: NetworkSource[]
  people_resolved?: number
  companies_resolved?: number
  identity_resolution_rate?: number
  interactions_total?: number
  two_way_share?: number
  edges_total?: number
  edge_tier_coverage?: RecordValue
  band_distribution?: RecordValue
  store_manifest?: StoreManifest
}

export type WarmPath = RecordValue & {
  target?: string
  target_company?: string
  objective?: string
  status?: string
  requester?: string
  connector?: string
  hops?: number
  band?: string
  min_edge_strength?: number
  evidence_tier?: string
  activation_mode?: string
  edges?: RelationshipEdge[]
  risk?: string
}

export type IntroReceipt = RecordValue & {
  stage?: string
  date?: string
  evidence?: string
}

export type IntroLedgerEntry = RecordValue & {
  target?: string
  requester?: string
  connector?: string
  warm_path_ref?: number
  status?: string
  policy?: string
  consent?: RecordValue & { connector_consented?: boolean; date?: string }
  draft_location?: string
  draft_id?: string
  receipts?: IntroReceipt[]
  risk?: string
}

export type InteractionRollup = RecordValue & {
  interactions_12mo?: number
  two_way_threads?: number
  meetings?: number
  first_interaction_at?: string | null
  last_interaction_at?: string | null
  owners?: string[]
  sources?: string[]
  reciprocity_score?: number
  note?: string
}

export type Packet = RecordValue & {
  client: string
  objective: string
  mode: string
  generated_at: string
  network_health?: NetworkHealth
  warm_paths?: WarmPath[]
  intro_ledger?: IntroLedgerEntry[]
}

export const packet = packetData as unknown as Packet

export function records(value: Json | undefined): RecordValue[] {
  return Array.isArray(value)
    ? value.filter((item): item is RecordValue => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : []
}

export function strings(value: Json | undefined): string[] {
  return Array.isArray(value) ? value.map(String) : []
}

export function numberValue(value: Json | undefined): number {
  return typeof value === "number" ? value : 0
}

export function objectValue(value: Json | undefined): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null
}

export function networkHealth(): NetworkHealth | null {
  return objectValue(packet.network_health) as NetworkHealth | null
}

export function warmPaths(): WarmPath[] {
  return records(packet.warm_paths) as WarmPath[]
}

export function introLedger(): IntroLedgerEntry[] {
  return records(packet.intro_ledger) as IntroLedgerEntry[]
}

export function relationshipEdges(): RelationshipEdge[] {
  return records(packet.relationships) as RelationshipEdge[]
}

export function interactionRollup(target: RecordValue): InteractionRollup | null {
  return objectValue(target.interaction_rollup) as InteractionRollup | null
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dossier"
}

export function targets(): RecordValue[] {
  return [
    ...records(packet.accounts).map((item) => ({ ...item, target_kind: "Account" } as RecordValue)),
    ...records(packet.people).map((item) => ({ ...item, target_kind: "Person" } as RecordValue)),
  ]
}

export function evidenceItems(value: Json, path = "packet"): Array<RecordValue & { packet_path: string }> {
  if (Array.isArray(value)) return value.flatMap((item, index) => evidenceItems(item, `${path}[${index}]`))
  if (!value || typeof value !== "object") return []
  const object = value as RecordValue
  const own = Array.isArray(object.evidence)
    ? records(object.evidence).map((item) => ({ ...item, packet_path: path }))
    : []
  return [...own, ...Object.entries(object).filter(([key]) => key !== "evidence").flatMap(([key, item]) => evidenceItems(item, `${path}.${key}`))]
}
