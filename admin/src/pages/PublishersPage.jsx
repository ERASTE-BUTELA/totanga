import { useState } from "react"
import { BookOpen, Building2 } from "lucide-react"
import { deletePublisher, listPublishers } from "../api/catalog.js"
import { useListNotice } from "../lib/useListNotice.js"
import { RowActions } from "../components/RowActions.jsx"
import { CatalogListPage } from "./CatalogListPage.jsx"
import { PublisherFormModal } from "./PublisherFormPage.jsx"
import { usePagedCatalog } from "./usePagedCatalog.js"

function loadPublishers(criteria) {
  return listPublishers({
    q: criteria.query,
    page: criteria.page,
    pageSize: criteria.pageSize,
    sort: criteria.sort,
  })
}

function figure(stats, key) {
  if (!stats) return "…"
  return Number(stats[key] || 0).toLocaleString("fr-FR")
}

export function PublishersPage() {
  const { data, error, onPageRequest, reload } = usePagedCatalog(loadPublishers)
  const [notice, setNotice] = useListNotice()
  const [actionError, setActionError] = useState("")
  const [modal, setModal] = useState(null)
  const rows = data?.results || []
  const stats = data?.stats

  async function onRemove(row) {
    if (!window.confirm(`Supprimer « ${row.name} » ?`)) return
    const result = await deletePublisher(row.id)
    if (!result.ok) {
      setActionError(result.error)
      return
    }
    setActionError("")
    reload()
  }

  function onSaved(message) {
    setNotice(message)
    setActionError("")
    reload()
  }

  return (
    <>
      {error || actionError ? <p role="alert" className="mb-4 rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error || actionError}</p> : null}
      {notice ? <p role="status" className="mb-4 rounded-panel border border-available bg-available-soft p-4 text-available">{notice}</p> : null}
      <CatalogListPage
        heading="Liste des éditeurs"
        one="éditeur"
        noun="éditeurs"
        addLabel="Ajouter un éditeur"
        onAdd={() => setModal({ mode: "create" })}
        placeholder="Rechercher un éditeur…"
        rows={rows}
        loading={!data && !error}
        onPageRequest={onPageRequest}
        totalCount={data?.count || 0}
        pageCount={data?.pages || 1}
        searchOf={(row) => row.name}
        sortOf={(row) => row.name}
        stats={[
          { label: "Éditeurs", value: figure(stats, "total"), trend: "dans le catalogue", icon: Building2, chip: "bg-lavender text-violet" },
          { label: "Éditeurs avec des livres", value: figure(stats, "with_books"), trend: "liés à une fiche", icon: Building2, chip: "bg-available-soft text-available" },
          { label: "Éditeurs sans livre", value: figure(stats, "without_books"), trend: "fiche seule", icon: Building2, chip: "bg-unavailable-soft text-unavailable" },
          { label: "Livres liés", value: figure(stats, "linked"), trend: "au total", icon: BookOpen, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
        ]}
        oneLine
        filters={[]}
        columns={[
          { key: "n", label: "#", render: (_row, index) => index + 1 },
          { key: "name", label: "Nom de l'éditeur", render: (row) => <span className="font-semibold text-heading">{row.name}</span> },
          { key: "notes", label: "Notes", render: (row) => row.notes || "—" },
          { key: "books", label: "Livres", render: (row) => row.books },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <RowActions
                onView={() => setModal({ mode: "view", publisherId: row.id })}
                onEdit={() => setModal({ mode: "edit", publisherId: row.id })}
                removeLabel="Supprimer"
                onRemove={() => onRemove(row)}
              />
            ),
          },
        ]}
      />
      {modal ? (
        <PublisherFormModal
          mode={modal.mode}
          publisherId={modal.publisherId}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      ) : null}
    </>
  )
}
