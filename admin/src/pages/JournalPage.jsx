import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { ChartColumn, ScrollText } from "lucide-react"
import { listJournal } from "../api/content.js"
import { canOpen } from "../nav/entries.js"
import { useSession } from "../session/SessionContext.jsx"
import { StatsPanel } from "./StatsPage.jsx"

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

function SectionTab({ icon: Icon, label, selected, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-control px-4 font-semibold ${
        selected ? "bg-violet text-on-primary" : "bg-lavender text-violet"
      }`}
    >
      <Icon aria-hidden="true" size={18} />
      {label}
    </button>
  )
}

function ActionsPanel() {
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
  if (rows.length === 0) return <p className="rounded-panel border border-line bg-panel p-6">Aucune action enregistrée.</p>

  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-panel shadow-card">
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

export function JournalPage() {
  const session = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const permissions = session.account?.permissions ?? []
  const role = session.account?.role
  const canActions = canOpen(permissions, "accounts.view_staffaction", role)
  const canStats = canOpen(permissions, "analytics.view_sitestat", role)

  const requested = searchParams.get("onglet") === "statistiques" ? "statistiques" : "actions"
  const section = requested === "statistiques" && canStats
    ? "statistiques"
    : canActions
      ? "actions"
      : canStats
        ? "statistiques"
        : "actions"

  function setSection(next) {
    if (next === "statistiques") {
      setSearchParams({ onglet: "statistiques" }, { replace: true })
      return
    }
    setSearchParams({}, { replace: true })
  }

  if (!canActions && !canStats) {
    return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">Accès refusé.</p>
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {canActions ? (
          <SectionTab
            icon={ScrollText}
            label="Actions du personnel"
            selected={section === "actions"}
            onClick={() => setSection("actions")}
          />
        ) : null}
        {canStats ? (
          <SectionTab
            icon={ChartColumn}
            label="Statistiques"
            selected={section === "statistiques"}
            onClick={() => setSection("statistiques")}
          />
        ) : null}
      </div>
      {section === "statistiques" ? <StatsPanel /> : <ActionsPanel />}
    </div>
  )
}
