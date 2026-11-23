import { useState } from "react"
import { useListNotice } from "../lib/useListNotice.js"
import { Archive, BookOpen, Layers, Library } from "lucide-react"
import { archiveBook, listBooks } from "../api/catalog.js"
import { bookNotices } from "./texts.js"
import { ConfirmModal } from "../components/ConfirmModal.jsx"
import { RowActions } from "../components/RowActions.jsx"
import { CatalogListPage } from "./CatalogListPage.jsx"
import { usePagedCatalog } from "./usePagedCatalog.js"

const BOOK_STATES = {
  Publié: "published",
  Brouillon: "draft",
  Archivé: "archived",
}

function loadBooks(criteria) {
  return listBooks({
    q: criteria.query,
    page: criteria.page,
    pageSize: criteria.pageSize,
    sort: criteria.sort,
    category: criteria.chosen.category || "",
    state: BOOK_STATES[criteria.chosen.status] || "",
    archive: criteria.chosen.archive || "",
  })
}

function mark(title) {
  return title.replace(/['’]/g, "").split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()
}

function statusClass(status) {
  if (status === "Archivé") return "rounded-full bg-canvas px-3 py-1 font-semibold text-muted"
  if (status === "Brouillon") return "rounded-full bg-lavender px-3 py-1 font-semibold text-violet"
  return "rounded-full bg-available-soft px-3 py-1 font-semibold text-available"
}

function figure(stats, key) {
  if (!stats) return "…"
  return Number(stats[key] || 0).toLocaleString("fr-FR")
}

export function BooksPage() {
  const { data, error, onPageRequest, reload } = usePagedCatalog(loadBooks)
  const [notice, setNotice] = useListNotice()
  const [actionError, setActionError] = useState("")
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const rows = data?.results || []
  const stats = data?.stats
  const categories = data?.categories || []

  async function confirmArchive() {
    if (!pending || busy) return
    const archive = pending.status !== "Archivé"
    setBusy(true)
    const result = await archiveBook(pending.id, archive)
    setBusy(false)
    if (!result.ok) {
      setActionError(result.error)
      setPending(null)
      return
    }
    setActionError("")
    setNotice(archive ? bookNotices.archived : bookNotices.restored)
    setPending(null)
    reload()
  }

  return (
    <>
      {error || actionError ? <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error || actionError}</p> : null}
      {notice ? <p role="status" className="mb-4 rounded-panel border border-available bg-available-soft p-4 text-available">{notice}</p> : null}
      <CatalogListPage
        heading="Liste des livres"
        headingIcon={BookOpen}
        one="livre"
        noun="livres"
        addLabel="Ajouter un livre"
        addTo="/catalogue/livres/nouveau"
        placeholder="Recherche par auteur, titre, éditeur, numéro d'enregistrement, Dewey…"
        rows={rows}
        loading={!data && !error}
        onPageRequest={onPageRequest}
        totalCount={data?.count || 0}
        pageCount={data?.pages || 1}
        searchOf={(row) => `${row.title} ${row.authors || ""} ${row.publisher || ""} ${row.isbn || ""} ${row.call_number || ""} ${row.inventory_number || ""} ${row.dewey || ""}`}
        sortOf={(row) => row.title}
        stats={[
          { label: "Livres", value: figure(stats, "books"), trend: "dans le catalogue", icon: BookOpen, chip: "bg-lavender text-violet" },
          { label: "Exemplaires disponibles", value: figure(stats, "available"), trend: "en rayon", icon: Library, chip: "bg-available-soft text-available" },
          { label: "Exemplaires indisponibles", value: figure(stats, "unavailable"), trend: "hors prêt", icon: Archive, chip: "bg-unavailable-soft text-unavailable" },
          { label: "Exemplaires", value: figure(stats, "copies"), trend: "disponibles et indisponibles", icon: Layers, chip: "bg-info-soft text-info" },
        ]}
        oneLine
        filters={[
          {
            id: "category",
            label: "Catégorie",
            options: [{ value: "", label: "Toutes" }, ...categories.map((item) => ({ value: String(item.id), label: item.label }))],
            match: () => true,
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
            match: () => true,
          },
          {
            id: "archive",
            label: "Archivage",
            options: [
              { value: "", label: "Tous" },
              { value: "actifs", label: "Non archivés" },
              { value: "archives", label: "Archivés" },
            ],
            match: () => true,
          },
        ]}
        columns={[
          {
            key: "cover",
            label: "Couverture",
            render: (row) => row.cover
              ? <img src={row.cover} alt="" className="h-14 w-10 rounded-md object-cover" />
              : <span className="grid h-14 w-10 place-items-center rounded-md bg-violet text-center font-semibold text-on-primary">{mark(row.title)}</span>,
          },
          {
            key: "title",
            label: "Titre",
            render: (row) => <span className="font-semibold text-heading">{row.title}</span>,
          },
          { key: "authors", label: "Auteurs", render: (row) => row.authors || "—" },
          {
            key: "category",
            label: "Catégorie",
            render: (row) =>
              row.category ? (
                <span className="rounded-full bg-lavender px-3 py-1 font-semibold text-violet">{row.category}</span>
              ) : (
                "—"
              ),
          },
          { key: "publisher", label: "Éditeur", render: (row) => row.publisher || "—" },
          {
            key: "copies",
            label: "Exemplaires",
            render: (row) => (
              <span className="font-semibold" title="Disponibles / Indisponibles">
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
                onRemove={() => setPending(row)}
              />
            ),
          },
        ]}
      />
      {pending ? (
        <ConfirmModal
          title={pending.status === "Archivé" ? "Remettre au catalogue" : "Confirmer l’archivage"}
          message={pending.status === "Archivé" ? bookNotices.confirmRestore : bookNotices.confirmArchive}
          confirmLabel={pending.status === "Archivé" ? "Désarchiver" : "Archiver"}
          busy={busy}
          onClose={() => !busy && setPending(null)}
          onConfirm={confirmArchive}
        />
      ) : null}
    </>
  )
}
