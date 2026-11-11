import { useEffect, useState } from "react"
import { listJournal } from "../api/content.js"

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

export function JournalPage() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    listJournal().then((result) => {
      if (!result.ok) setError(result.error)
      else setRows(result.data)
    })
  }, [])

  if (error) return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p>
  if (!rows) return <p>Chargement…</p>
  if (rows.length === 0) return <p className="rounded-panel border border-line bg-white p-6">Aucune action enregistrée.</p>

  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-white shadow-card">
      <table className="w-full min-w-[40rem] text-left">
        <thead>
          <tr className="border-b border-line text-muted">
            <th className="px-4 py-3 font-semibold">Quand</th>
            <th className="px-4 py-3 font-semibold">Qui</th>
            <th className="px-4 py-3 font-semibold">Action</th>
            <th className="px-4 py-3 font-semibold">Objet</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-b-0">
              <td className="px-4 py-3">{formatWhen(row.created_at)}</td>
              <td className="px-4 py-3">{row.actor || "—"}</td>
              <td className="px-4 py-3">{row.action}</td>
              <td className="px-4 py-3">{row.target_type}{row.target_id ? ` #${row.target_id}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
