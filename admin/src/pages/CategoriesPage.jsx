import { useState } from "react"
import { BookOpen, Layers, Tag } from "lucide-react"
import { deleteCategory, listCategories } from "../api/catalog.js"
import { RowActions } from "../components/RowActions.jsx"
import { CatalogListPage } from "./CatalogListPage.jsx"
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
  const [actionError, setActionError] = useState("")
  const rows = data?.results || []
  const stats = data?.stats

  async function onRemove(row) {
    if (!window.confirm(`Supprimer « ${row.name} » ?`)) return
    const result = await deleteCategory(row.id)
    if (!result.ok) {
      setActionError(result.error)
      return
    }
    setActionError("")
    reload()
  }

  return (
    <>
      {error || actionError ? <p role="alert" className="mb-4 rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error || actionError}</p> : null}
      <CatalogListPage
        heading="Liste des catégories"
        one="catégorie"
        noun="catégories"
        addLabel="Ajouter une catégorie"
        addTo="/catalogue/categories/nouveau"
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
          { label: "Catégories sans livre", value: figure(stats, "without_books"), trend: "encore vides", icon: Tag, chip: "bg-[#fde7c7] text-[#9a3412]" },
          { label: "Livres classés", value: figure(stats, "classified"), trend: "au total", icon: BookOpen, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
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
                viewTo={`/catalogue/categories/${row.id}`}
                editTo={`/catalogue/categories/${row.id}/modifier`}
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
