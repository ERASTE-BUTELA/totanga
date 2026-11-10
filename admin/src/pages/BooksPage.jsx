import { useEffect, useState } from "react"
import { Archive, BookOpen, Layers, Library } from "lucide-react"
import { archiveBook, listBooks } from "../api/catalog.js"
import { RowActions } from "../components/RowActions.jsx"
import { CatalogListPage } from "./CatalogListPage.jsx"

function mark(title) {
  return title.replace(/['’]/g, "").split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()
}

function statusClass(status) {
  if (status === "Archivé") return "rounded-full bg-canvas px-3 py-1 font-semibold text-muted"
  if (status === "Brouillon") return "rounded-full bg-lavender px-3 py-1 font-semibold text-violet"
  return "rounded-full bg-available-soft px-3 py-1 font-semibold text-available"
}

export function BooksPage() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    listBooks().then((result) => {
      if (!result.ok) setError(result.error)
      else setRows(result.data)
    })
  }, [])

  async function onRemove(row) {
    const archive = row.status !== "Archivé"
    const question = archive
      ? `Archiver « ${row.title} » ? Le livre reste dans le catalogue.`
      : `Remettre « ${row.title} » au catalogue ?`
    if (!window.confirm(question)) return
    const result = await archiveBook(row.id, archive)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, status: result.data.status, available: result.data.available, unavailable: result.data.unavailable } : item)))
  }

  if (error) return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p>
  if (!rows) return <p>Chargement…</p>

  const available = rows.reduce((sum, row) => sum + row.available, 0)
  const unavailable = rows.reduce((sum, row) => sum + row.unavailable, 0)

  return (
    <CatalogListPage
      heading="Liste des livres"
      headingIcon={BookOpen}
      one="livre"
      noun="livres"
      addLabel="Ajouter un livre"
      addTo="/catalogue/livres/nouveau"
      placeholder="Rechercher un livre (titre, auteur, ISBN…)"
      rows={rows}
      searchOf={(row) => `${row.title} ${row.authors} ${row.isbn} ${row.summary}`}
      sortOf={(row) => row.title}
      stats={[
        { label: "Livres", value: String(rows.length), trend: "dans le catalogue", icon: BookOpen, chip: "bg-lavender text-violet" },
        { label: "Exemplaires disponibles", value: String(available), trend: "en rayon", icon: Library, chip: "bg-available-soft text-available" },
        { label: "Exemplaires indisponibles", value: String(unavailable), trend: "hors prêt", icon: Archive, chip: "bg-unavailable-soft text-unavailable" },
        { label: "Exemplaires", value: String(available + unavailable), trend: "disponibles et indisponibles", icon: Layers, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
      ]}
      filters={[
        {
          id: "category",
          label: "Catégorie",
          options: [{ value: "", label: "Toutes" }, ...[...new Set(rows.map((row) => row.category))].map((item) => ({ value: item, label: item }))],
          match: (row, value) => row.category === value,
        },
        {
          id: "status",
          label: "Statut du livre",
          options: [
            { value: "", label: "Tous" },
            { value: "Publié", label: "Publié" },
            { value: "Brouillon", label: "Brouillon" },
            { value: "Archivé", label: "Archivé" },
          ],
          match: (row, value) => row.status === value,
        },
        {
          id: "author",
          label: "Auteur",
          options: [{ value: "", label: "Tous" }, ...[...new Set(rows.map((row) => row.authors).filter(Boolean))].map((item) => ({ value: item, label: item }))],
          match: (row, value) => row.authors === value,
        },
        {
          id: "archive",
          label: "Archivage",
          options: [
            { value: "", label: "Tous" },
            { value: "actifs", label: "Non archivés" },
            { value: "archives", label: "Archivés" },
          ],
          match: (row, value) => (value === "archives" ? row.status === "Archivé" : row.status !== "Archivé"),
        },
      ]}
      columns={[
        { key: "n", label: "#", render: (_row, index) => index + 1 },
        {
          key: "cover",
          label: "Couverture",
          render: (row) => row.cover
            ? <img src={row.cover} alt="" className="h-14 w-10 rounded-md object-cover" />
            : <span className="grid h-14 w-10 place-items-center rounded-md bg-violet text-center font-semibold text-white">{mark(row.title)}</span>,
        },
        {
          key: "title",
          label: "Titre",
          render: (row) => <span className="font-semibold text-heading">{row.title}</span>,
        },
        { key: "authors", label: "Auteurs", render: (row) => row.authors },
        {
          key: "category",
          label: "Catégorie",
          render: (row) => <span className="rounded-full bg-lavender px-3 py-1 font-semibold text-violet">{row.category}</span>,
        },
        { key: "isbn", label: "ISBN", render: (row) => row.isbn || "—" },
        { key: "year", label: "Année", render: (row) => row.year },
        {
          key: "copies",
          label: "Exemplaires (Disp. / Indisp.)",
          render: (row) => (
            <span className="font-semibold">
              <span className="text-available">{row.available}</span>
              <span className="text-muted"> / </span>
              <span className="text-unavailable">{row.unavailable}</span>
            </span>
          ),
        },
        { key: "status", label: "Statut", render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
        {
          key: "actions",
          label: "Actions",
          render: (row) => (
            <RowActions
              viewTo={`/catalogue/livres/${row.id}`}
              editTo={`/catalogue/livres/${row.id}/modifier`}
              removeLabel={row.status === "Archivé" ? "Désarchiver" : "Archiver"}
              onRemove={() => onRemove(row)}
            />
          ),
        },
      ]}
    />
  )
}
