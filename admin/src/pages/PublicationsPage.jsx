import { useEffect, useState } from "react"
import { CheckCircle2, FileText, Star, StarOff } from "lucide-react"
import { deletePublication, listPublications, setPublicationFields } from "../api/content.js"
import { RowActions } from "../components/RowActions.jsx"
import { useListNotice } from "../lib/useListNotice.js"
import { CatalogListPage } from "./CatalogListPage.jsx"
import { contentNotices } from "./texts.js"

const CATEGORY_CLASS = {
  Culture: "bg-lavender text-violet",
  Actualité: "bg-[#e7eefc] text-[#1d4ed8]",
  Conseils: "bg-available-soft text-available",
  Événement: "bg-[#fde7c7] text-[#9a3412]",
  Technologie: "bg-[#e7eefc] text-[#1d4ed8]",
}

function statusClass(status) {
  if (status === "Brouillon") return "rounded-full bg-[#fde7c7] px-3 py-1 font-semibold text-[#9a3412]"
  if (status === "Archivé") return "rounded-full bg-canvas px-3 py-1 font-semibold text-muted"
  return "rounded-full bg-available-soft px-3 py-1 font-semibold text-available"
}

function when(value) {
  if (!value) return "—"
  const date = new Date(value.includes("T") ? value : `${value}:00`)
  if (Number.isNaN(date.getTime())) return "—"
  const day = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  return `${day} à ${time}`
}

export function PublicationsPage() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useListNotice()

  useEffect(() => {
    listPublications().then((result) => {
      if (!result.ok) setError(result.error)
      else setRows(result.data)
    })
  }, [])

  async function toggleFeatured(row) {
    const result = await setPublicationFields(row.id, { featured: !row.featured })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setRows((current) => current.map((item) => (item.id === row.id ? result.data : item)))
  }

  async function onRemove(row) {
    if (!window.confirm(contentNotices.confirmDeletePublication)) return
    const result = await deletePublication(row.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setNotice(contentNotices.publicationDeleted)
    setRows((current) => current.filter((item) => item.id !== row.id))
  }

  if (error && !rows) return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p>
  if (!rows) return <p>Chargement…</p>

  const published = rows.filter((row) => row.status === "Publié").length
  const drafts = rows.filter((row) => row.status === "Brouillon").length
  const featured = rows.filter((row) => row.featured).length

  return (
    <>
      {error ? <p role="alert" className="mb-4 rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p> : null}
      {notice ? <p role="status" className="mb-4 rounded-panel border border-available bg-available-soft p-4 text-available">{notice}</p> : null}
      <CatalogListPage
        heading="Liste des publications"
        headingIcon={FileText}
        one="publication"
        noun="publications"
        addLabel="Nouvelle publication"
        addTo="/publications/nouveau"
        placeholder="Rechercher une publication (titre, catégorie, rédacteur…)"
        rows={rows}
        showSort={false}
        searchOf={(row) => `${row.title} ${row.category} ${row.author}`}
        sortOf={(row) => `${row.pinned ? "0" : "1"}${row.published_at || ""}`}
        stats={[
          { label: "Publications totales", value: String(rows.length), trend: "dans la liste", icon: FileText, chip: "bg-lavender text-violet" },
          { label: "Publications publiées", value: String(published), trend: "visibles", icon: CheckCircle2, chip: "bg-available-soft text-available" },
          { label: "En brouillon", value: String(drafts), trend: "pas encore publiées", icon: FileText, chip: "bg-[#fde7c7] text-[#9a3412]" },
          { label: "À la une", value: String(featured), trend: "mises en avant", icon: Star, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
        ]}
        filters={[
          {
            id: "status",
            label: "Statut",
            options: [
              { value: "", label: "Tous" },
              { value: "Publié", label: "Publié" },
              { value: "Brouillon", label: "Brouillon" },
            ],
            match: (row, value) => row.status === value,
          },
          {
            id: "category",
            label: "Catégorie",
            options: [{ value: "", label: "Toutes" }, ...[...new Set(rows.map((row) => row.category))].map((item) => ({ value: item, label: item }))],
            match: (row, value) => row.category === value,
          },
          {
            id: "featured",
            label: "À la une",
            options: [
              { value: "", label: "Tous" },
              { value: "oui", label: "À la une" },
              { value: "non", label: "Les autres" },
            ],
            match: (row, value) => (value === "oui" ? row.featured : !row.featured),
          },
        ]}
        columns={[
          { key: "n", label: "#", render: (_row, index) => index + 1 },
          {
            key: "image",
            label: "Image",
            render: (row) =>
              row.image ? (
                <img src={row.image} alt="" className="h-12 w-16 rounded-md object-cover" />
              ) : (
                <span className="inline-flex h-12 w-16 items-center justify-center rounded-md bg-canvas text-muted">—</span>
              ),
          },
          { key: "title", label: "Titre", render: (row) => <span className="font-semibold text-heading">{row.title}</span> },
          {
            key: "category",
            label: "Catégorie",
            render: (row) => <span className={`rounded-full px-3 py-1 font-semibold ${CATEGORY_CLASS[row.category] || "bg-lavender text-violet"}`}>{row.category}</span>,
          },
          { key: "author", label: "Rédacteur", render: (row) => row.author },
          { key: "status", label: "Statut", render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
          {
            key: "featured",
            label: "À la une",
            render: (row) => (
              <button type="button" aria-pressed={row.featured} aria-label={row.featured ? "Retirer de la une" : "Mettre à la une"} className={`inline-flex h-11 w-11 items-center justify-center ${row.featured ? "text-gold" : "text-line"}`} onClick={() => toggleFeatured(row)}>
                {row.featured ? <Star size={18} fill="currentColor" /> : <StarOff size={18} />}
              </button>
            ),
          },
          { key: "date", label: "Date de publication", render: (row) => when(row.published_at || row.publishedAt) },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <RowActions
                viewTo={`/publications/${row.id}`}
                editTo={`/publications/${row.id}/modifier`}
                removeLabel="Supprimer"
                onRemove={() => onRemove(row)}
              />
            ),
          },
        ]}
      />
    </>
  )
}
