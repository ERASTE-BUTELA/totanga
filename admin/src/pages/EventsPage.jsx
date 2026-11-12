import { useEffect, useState } from "react"
import { CalendarDays, CheckCircle2, Clock, FileText } from "lucide-react"
import { listEvents, setEventState } from "../api/content.js"
import { RowActions } from "../components/RowActions.jsx"
import { useListNotice } from "../lib/useListNotice.js"
import { CatalogListPage } from "./CatalogListPage.jsx"
import { contentNotices } from "./texts.js"

const TYPES = [
  ["conference", "Conférence"],
  ["atelier", "Atelier"],
  ["rencontre", "Rencontre littéraire"],
  ["salon", "Salon"],
  ["exposition", "Exposition"],
  ["lecture", "Lecture"],
]

function formatWhen(value) {
  if (!value) return ""
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

function statusClass(status) {
  if (status === "Archivé") return "rounded-full bg-canvas px-3 py-1 font-semibold text-muted"
  if (status === "Brouillon") return "rounded-full bg-[#fde7c7] px-3 py-1 font-semibold text-[#9a3412]"
  return "rounded-full bg-available-soft px-3 py-1 font-semibold text-available"
}

export function EventsPage() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useListNotice()

  useEffect(() => {
    listEvents().then((result) => {
      if (!result.ok) setError(result.error)
      else setRows(result.data)
    })
  }, [])

  async function onArchive(row) {
    const archive = row.status !== "Archivé"
    const question = archive ? contentNotices.confirmArchiveEvent : contentNotices.confirmRestoreEvent
    if (!window.confirm(question)) return
    const result = await setEventState(row.id, archive ? "archived" : "published")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setNotice(archive ? contentNotices.eventArchived : contentNotices.eventRestored)
    setRows((current) => current.map((item) => (item.id === row.id ? result.data : item)))
  }

  if (error && !rows) return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p>
  if (!rows) return <p>Chargement…</p>

  const now = Date.now()
  const published = rows.filter((row) => row.status === "Publié").length
  const drafts = rows.filter((row) => row.status === "Brouillon").length
  const upcoming = rows.filter((row) => {
    if (row.status !== "Publié") return false
    const start = new Date(row.starts_at).getTime()
    return Number.isFinite(start) && start >= now
  }).length

  return (
    <section className="grid gap-4">
      {error ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p> : null}
      {notice ? <p role="status" className="rounded-panel border border-available bg-available-soft p-4 text-available">{notice}</p> : null}
      <CatalogListPage
        heading="Liste des événements"
        headingIcon={CalendarDays}
        one="événement"
        noun="événements"
        addLabel="Nouvel événement"
        addTo="/evenements/nouveau"
        placeholder="Rechercher un événement (titre, lieu…)"
        rows={rows}
        showSort={false}
        searchOf={(row) => `${row.title} ${row.summary} ${row.location} ${row.type_label}`}
        sortOf={(row) => row.starts_at || ""}
        stats={[
          { label: "Événements", value: String(rows.length), trend: "dans la liste", icon: CalendarDays, chip: "bg-lavender text-violet" },
          { label: "Publiés", value: String(published), trend: "visibles", icon: CheckCircle2, chip: "bg-available-soft text-available" },
          { label: "En brouillon", value: String(drafts), trend: "pas encore publiés", icon: FileText, chip: "bg-[#fde7c7] text-[#9a3412]" },
          { label: "À venir", value: String(upcoming), trend: "publiés à venir", icon: Clock, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
        ]}
        filters={[
          {
            id: "type",
            label: "Type",
            options: [{ value: "", label: "Tous" }, ...TYPES.map(([value, label]) => ({ value, label }))],
            match: (row, value) => row.event_type === value,
          },
          {
            id: "status",
            label: "Statut",
            options: [
              { value: "", label: "Tous" },
              { value: "Publié", label: "Publié" },
              { value: "Brouillon", label: "Brouillon" },
              { value: "Archivé", label: "Archivé" },
            ],
            match: (row, value) => row.status === value,
          },
        ]}
        columns={[
          { key: "n", label: "#", render: (_row, index) => index + 1 },
          { key: "title", label: "Titre", render: (row) => <span className="font-semibold text-heading">{row.title}</span> },
          { key: "type", label: "Type", render: (row) => row.type_label },
          { key: "when", label: "Quand", render: (row) => `${formatWhen(row.starts_at)} – ${formatWhen(row.ends_at)}` },
          { key: "location", label: "Lieu", render: (row) => row.location },
          { key: "status", label: "Statut", render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <RowActions
                viewTo={`/evenements/${row.id}`}
                editTo={`/evenements/${row.id}/modifier`}
                removeLabel={row.status === "Archivé" ? "Remettre en ligne" : "Archiver"}
                onRemove={() => onArchive(row)}
              />
            ),
          },
        ]}
      />
    </section>
  )
}
