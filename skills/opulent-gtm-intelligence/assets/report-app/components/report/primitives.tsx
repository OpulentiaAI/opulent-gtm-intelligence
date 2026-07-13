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
