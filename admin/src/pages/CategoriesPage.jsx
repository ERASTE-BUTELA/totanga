import { useState } from "react"
import { BookOpen, Layers, Tag } from "lucide-react"
import { deleteCategory, listCategories } from "../api/catalog.js"
import { useListNotice } from "../lib/useListNotice.js"
import { ConfirmModal } from "../components/ConfirmModal.jsx"
import { RowActions } from "../components/RowActions.jsx"
import { CatalogListPage } from "./CatalogListPage.jsx"
import { CategoryFormModal } from "./CategoryFormPage.jsx"
import { usePagedCatalog } from "./usePagedCatalog.js"

function loadCategories(criteria) {
  return listCategories({
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

export function CategoriesPage() {
  const { data, error, onPageRequest, reload } = usePagedCatalog(loadCategories)
  const [notice, setNotice] = useListNotice()
  const [actionError, setActionError] = useState("")
  const [modal, setModal] = useState(null)
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const rows = data?.results || []
  const stats = data?.stats

  async function confirmRemove() {
    if (!pending || busy) return
    setBusy(true)
    const result = await deleteCategory(pending.id)
    setBusy(false)
    if (!result.ok) {
      setActionError(result.error)
      setPending(null)
      return
    }
    setActionError("")
    setPending(null)
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
        heading="Liste des catégories"
        one="catégorie"
        noun="catégories"
        addLabel="Ajouter une catégorie"
        onAdd={() => setModal({ mode: "create" })}
        placeholder="Rechercher une catégorie (nom, description…)"
        rows={rows}
        loading={!data && !error}
        onPageRequest={onPageRequest}
        totalCount={data?.count || 0}
        pageCount={data?.pages || 1}
        searchOf={(row) => row.name}
        sortOf={(row) => row.name}
        stats={[
          { label: "Catégories", value: figure(stats, "total"), trend: "dans le catalogue", icon: Tag, chip: "bg-lavender text-violet" },
          { label: "Catégories avec des livres", value: figure(stats, "with_books"), trend: "utilisées", icon: Layers, chip: "bg-available-soft text-available" },
          { label: "Catégories sans livre", value: figure(stats, "without_books"), trend: "encore vides", icon: Tag, chip: "bg-warning-soft text-warning" },
          { label: "Livres classés", value: figure(stats, "classified"), trend: "au total", icon: BookOpen, chip: "bg-info-soft text-info" },
        ]}
        oneLine
        filters={[]}
        columns={[
          { key: "n", label: "#", render: (_row, index) => index + 1 },
          { key: "name", label: "Nom de la catégorie", render: (row) => <span className="font-semibold text-heading">{row.parent_name ? `${row.parent_name} — ${row.name}` : row.name}</span> },
          { key: "description", label: "Description", render: (row) => row.description || "—" },
          { key: "books", label: "Nombre de livres", render: (row) => row.books },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <RowActions
                onView={() => setModal({ mode: "view", categoryId: row.id })}
                onEdit={() => setModal({ mode: "edit", categoryId: row.id })}
                removeLabel="Supprimer"
                onRemove={() => setPending(row)}
              />
            ),
          },
        ]}
      />
      {modal ? (
        <CategoryFormModal
          mode={modal.mode}
          categoryId={modal.categoryId}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      ) : null}
      {pending ? (
        <ConfirmModal
          title="Confirmer la suppression"
          message={`Supprimer « ${pending.name} » ? Cette action est définitive.`}
          busy={busy}
          onClose={() => !busy && setPending(null)}
          onConfirm={confirmRemove}
        />
      ) : null}
    </>
  )
}
