import type { Json, RecordValue } from "@/lib/report"

export function Section({
  id,
  label,
  title,
  description,
  children,
}: {
  id: string
  label: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="section">
      <div className="measure mb-8">
        <p className="eyebrow mb-3">{label}</p>
        <h2 className="section-title">{title}</h2>
        {description && <p className="prose-copy mt-3">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function plainLabel(value: string) {
  const text = value.replaceAll("_", " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function Fold({
  summary,
  hint,
  tone = "block",
  children,
}: {
  summary: string
  hint?: string
  tone?: "block" | "inline"
  children: React.ReactNode
}) {
  return (
    <details className={tone === "block" ? "fold card" : "fold-inline"}>
      <summary>
        <span className="fold-title">{summary}</span>
        {hint && <span className="fold-hint">{hint}</span>}
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  )
}

export function JsonValue({ value }: { value: Json }) {
  if (value === null || value === "") return <span className="text-muted-foreground">Not recorded</span>
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>
  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    return <a className="underline decoration-border hover:decoration-foreground" href={value} target="_blank" rel="noreferrer">{value}</a>
  }
  if (typeof value !== "object") return <span>{String(value)}</span>
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-muted-foreground">None recorded</span>
    if (value.every((item) => typeof item !== "object")) {
      return <ul className="list-disc space-y-1 pl-4">{value.map((item, index) => <li key={index}>{String(item)}</li>)}</ul>
    }
    return <div className="space-y-3">{value.map((item, index) => <div className="rounded-xl bg-muted/45 p-3" key={index}><JsonValue value={item} /></div>)}</div>
  }
  return <JsonGrid value={value as RecordValue} />
}

export function JsonGrid({ value, omit = [] }: { value: RecordValue; omit?: string[] }) {
  return (
    <dl className="json-grid text-sm">
      {Object.entries(value).filter(([key]) => !omit.includes(key)).map(([key, item]) => (
        <div className="contents" key={key}>
          <dt>{label(key)}</dt>
          <dd><JsonValue value={item} /></dd>
        </div>
      ))}
    </dl>
  )
}

const narrativeTitleKeys = ["name", "title", "target", "organization", "question", "system"]
const narrativePillKeys = ["status", "confidence", "category", "relationship_label"]

/**
 * Decision-layer card list: named prose fields render expanded with plain
 * labels; every remaining field stays available inside a collapsed details
 * block, so nothing recorded is dropped.
 */
export function NarrativeCards({
  items,
  lead,
  labels = {},
  empty = "None recorded.",
  detailsSummary = "Full record",
}: {
  items: RecordValue[]
  lead: string[]
  labels?: Record<string, string>
  empty?: string
  detailsSummary?: string
}) {
  if (!items.length) return <div className="card p-5 text-sm text-muted-foreground">{empty}</div>
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item, index) => {
        const titleKey = narrativeTitleKeys.find((key) => typeof item[key] === "string" && item[key])
        const pillKey = narrativePillKeys.find((key) => key !== titleKey && typeof item[key] === "string" && item[key])
        const leadKeys = lead.filter((key) => key !== titleKey && key !== pillKey && item[key] != null && item[key] !== "")
        const omitted = [titleKey, pillKey, ...leadKeys].filter((key): key is string => Boolean(key))
        const rest = Object.keys(item).filter((key) => !omitted.includes(key))
        return (
          <article className="card p-5" key={index}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-medium tracking-tight">{titleKey ? String(item[titleKey]) : `Record ${index + 1}`}</h3>
              {pillKey && <span className="pill">{plainLabel(String(item[pillKey]))}</span>}
            </div>
            {leadKeys.map((key) => (
              <div className="mt-3" key={key}>
                <p className="eyebrow mb-1">{labels[key] ?? plainLabel(key)}</p>
                <div className="text-sm leading-relaxed"><JsonValue value={item[key]} /></div>
              </div>
            ))}
            {rest.length > 0 && (
              <Fold summary={detailsSummary} tone="inline">
                <JsonGrid value={item} omit={omitted} />
              </Fold>
            )}
          </article>
        )
      })}
    </div>
  )
}

export function RecordCards({ items, empty = "None recorded." }: { items: RecordValue[]; empty?: string }) {
  if (!items.length) return <div className="card p-5 text-sm text-muted-foreground">{empty}</div>
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item, index) => {
        const title = String(item.name || item.title || item.target || item.organization || item.system || `Record ${index + 1}`)
        return (
          <article className="card p-5" key={`${title}-${index}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="font-medium tracking-tight">{title}</h3>
              {(item.status || item.confidence || item.result) && <span className="pill">{String(item.status || item.confidence || item.result)}</span>}
            </div>
            <JsonGrid value={item} omit={["name", "title", "target", "organization", "system", "status", "confidence", "result"]} />
          </article>
        )
      })}
    </div>
  )
}
