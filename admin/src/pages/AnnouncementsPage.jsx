import { useEffect, useState } from "react"
import { AlertTriangle, Megaphone } from "lucide-react"
import { listAnnouncements, setAnnouncementState } from "../api/content.js"
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

  async function onArchive(row) {
    const archive = row.status !== "Archivé"
    const question = archive ? contentNotices.confirmArchiveNotice : contentNotices.confirmRestoreNotice
    if (!window.confirm(question)) return
    const result = await setAnnouncementState(row.id, archive ? "archived" : "published")
    if (!result.ok) {
      setError(result.error)
      return
    }
    setNotice(archive ? contentNotices.noticeArchived : contentNotices.noticeRestored)
    setRows((current) => current.map((item) => (item.id === row.id ? result.data : item)))
  }

  if (error && !rows) return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p>
  if (!rows) return <p>Chargement…</p>

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
