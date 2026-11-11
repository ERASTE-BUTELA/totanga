import { useEffect, useState } from "react"
import { listMessages } from "../api/content.js"

function formatWhen(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kinshasa",
  })
}

export function MessagesPage() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")
  const [open, setOpen] = useState(null)

  useEffect(() => {
    listMessages().then((result) => {
      if (!result.ok) setError(result.error)
      else setRows(result.data)
    })
  }, [])

  if (error) return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p>
  if (!rows) return <p>Chargement…</p>
  if (rows.length === 0) return <p className="rounded-panel border border-line bg-white p-6">Aucun message.</p>

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <article key={row.id} className="rounded-panel border border-line bg-white p-4 shadow-card">
          <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(open === row.id ? null : row.id)}>
            <span>
              <span className="block font-semibold text-heading">{row.subject || "Message"}</span>
              <span className="text-muted">{row.name} · {formatWhen(row.created_at)}</span>
            </span>
            <span className="font-semibold text-violet">{open === row.id ? "Fermer" : "Lire"}</span>
          </button>
          {open === row.id ? (
            <div className="mt-3 border-t border-line pt-3">
              <p className="text-muted">{row.email}</p>
              <p className="mt-2 whitespace-pre-wrap">{row.body}</p>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}
