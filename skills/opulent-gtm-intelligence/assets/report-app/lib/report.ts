import packetData from "@/data/packet.json"

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type RecordValue = { [key: string]: Json }
export type Packet = RecordValue & {
  client: string
  objective: string
  mode: string
  generated_at: string
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
