import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, FileText, Megaphone, Star } from "lucide-react"
import { deleteAnnouncement, listAnnouncements } from "../api/content.js"
import { RowActions } from "../components/RowActions.jsx"
import { useListNotice } from "../lib/useListNotice.js"
import { CatalogListPage } from "./CatalogListPage.jsx"
import { contentNotices } from "./texts.js"

const CATEGORIES = [
  ["informations", "Informations générales"],
  ["acquisitions", "Nouvelles acquisitions"],
  ["horaires", "Horaires et services"],
  ["maintenance", "Maintenance et travaux"],
]

function formatWhen(value) {
  if (!value) return ""
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: value.includes("T") ? "2-digit" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
    timeZone: "Africa/Kinshasa",
  })
}

function period(row) {
  const published = formatWhen(row.published_at)
  if (!row.display_until) return published ? `Publiée le ${published}` : "—"
  return `Du ${published} au ${formatWhen(row.display_until)}`
}

function statusClass(status) {
  if (status === "Archivé") return "rounded-full bg-canvas px-3 py-1 font-semibold text-muted"
  if (status === "Brouillon") return "rounded-full bg-[#fde7c7] px-3 py-1 font-semibold text-[#9a3412]"
  return "rounded-full bg-available-soft px-3 py-1 font-semibold text-available"
}

export function AnnouncementsPage() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useListNotice()

  useEffect(() => {
    listAnnouncements().then((result) => {
      if (!result.ok) setError(result.error)
      else setRows(result.data)
    })
  }, [])

  async function onRemove(row) {
    if (!window.confirm(contentNotices.confirmDeleteNotice)) return
    const result = await deleteAnnouncement(row.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setNotice(contentNotices.noticeDeleted)
    setRows((current) => current.filter((item) => item.id !== row.id))
  }

  if (error && !rows) return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p>
  if (!rows) return <p>Chargement…</p>

  const published = rows.filter((row) => row.status === "Publié").length
  const drafts = rows.filter((row) => row.status === "Brouillon").length
  const important = rows.filter((row) => row.important).length

  return (
    <section className="grid gap-4">
      {error ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p> : null}
      {notice ? <p role="status" className="rounded-panel border border-available bg-available-soft p-4 text-available">{notice}</p> : null}
      <CatalogListPage
        heading="Liste des annonces"
        headingIcon={Megaphone}
        one="annonce"
        noun="annonces"
        addLabel="Nouvelle annonce"
        addTo="/annonces/nouveau"
        placeholder="Rechercher une annonce (titre, contenu…)"
        rows={rows}
        showSort={false}
        searchOf={(row) => `${row.title} ${row.body} ${row.category_label}`}
        sortOf={(row) => row.published_at || ""}
        stats={[
          { label: "Annonces", value: String(rows.length), trend: "dans la liste", icon: Megaphone, chip: "bg-lavender text-violet" },
          { label: "Publiées", value: String(published), trend: "visibles", icon: CheckCircle2, chip: "bg-available-soft text-available" },
          { label: "En brouillon", value: String(drafts), trend: "pas encore publiées", icon: FileText, chip: "bg-[#fde7c7] text-[#9a3412]" },
          { label: "Importantes", value: String(important), trend: "mises en avant", icon: Star, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
        ]}
        filters={[
          {
            id: "category",
            label: "Catégorie",
            options: [{ value: "", label: "Toutes" }, ...CATEGORIES.map(([value, label]) => ({ value, label }))],
            match: (row, value) => row.category === value,
          },
          {
            id: "important",
            label: "Important",
            options: [
              { value: "", label: "Toutes" },
              { value: "oui", label: "Importantes" },
              { value: "non", label: "Les autres" },
            ],
            match: (row, value) => (value === "oui" ? row.important : !row.important),
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
          {
            key: "image",
            label: "Image",
            render: (row) => row.image
              ? <img src={row.image} alt="" className="h-12 w-16 rounded-md object-cover" />
              : <span className="inline-flex h-12 w-16 items-center justify-center rounded-md bg-unavailable text-white"><AlertTriangle size={22} /></span>,
          },
          { key: "title", label: "Titre", render: (row) => <span className="font-semibold text-heading">{row.title}</span> },
          { key: "category", label: "Catégorie", render: (row) => row.category_label },
          { key: "important", label: "Important", render: (row) => (row.important ? "Oui" : "—") },
          { key: "period", label: "Publication", render: (row) => period(row) },
          { key: "status", label: "Statut", render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <RowActions
                viewTo={`/annonces/${row.id}`}
                editTo={`/annonces/${row.id}/modifier`}
                removeLabel="Supprimer"
                onRemove={() => onRemove(row)}
              />
            ),
          },
        ]}
      />
    </section>
  )
}
