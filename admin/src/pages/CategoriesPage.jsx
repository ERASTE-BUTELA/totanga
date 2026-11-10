import { useEffect, useState } from "react"
import { BookOpen, Layers, Tag } from "lucide-react"
import { deleteCategory, listCategories } from "../api/catalog.js"
import { RowActions } from "../components/RowActions.jsx"
import { CatalogListPage } from "./CatalogListPage.jsx"

export function CategoriesPage() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    listCategories().then((result) => {
      if (!result.ok) setError(result.error)
      else setRows(result.data)
    })
  }, [])

  async function onRemove(row) {
    if (!window.confirm(`Supprimer « ${row.name} » ?`)) return
    const result = await deleteCategory(row.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setRows((current) => current.filter((item) => item.id !== row.id))
  }

  if (error) return <p role="alert" className="rounded-panel border border-unavailable bg-unavailable-soft p-4 text-unavailable">{error}</p>
  if (!rows) return <p>Chargement…</p>

  const withBooks = rows.filter((row) => row.books > 0).length

  return (
    <CatalogListPage
      heading="Liste des catégories"
      one="catégorie"
      noun="catégories"
      addLabel="Ajouter une catégorie"
      addTo="/catalogue/categories/nouveau"
      placeholder="Rechercher une catégorie (nom, description…)"
      rows={rows}
      searchOf={(row) => `${row.name} ${row.description}`}
      sortOf={(row) => row.name}
      stats={[
        { label: "Catégories", value: String(rows.length), trend: "dans le catalogue", icon: Tag, chip: "bg-lavender text-violet" },
        { label: "Catégories avec des livres", value: String(withBooks), trend: "utilisées", icon: Layers, chip: "bg-available-soft text-available" },
        { label: "Catégories sans livre", value: String(rows.length - withBooks), trend: "encore vides", icon: Tag, chip: "bg-[#fde7c7] text-[#9a3412]" },
        { label: "Livres classés", value: String(rows.reduce((sum, row) => sum + row.books, 0)), trend: "au total", icon: BookOpen, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
      ]}
      filters={[]}
      columns={[
        { key: "n", label: "#", render: (_row, index) => index + 1 },
        { key: "name", label: "Nom de la catégorie", render: (row) => <span className="font-semibold text-heading">{row.name}</span> },
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
  )
}
