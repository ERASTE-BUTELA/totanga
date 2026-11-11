import { useState } from "react"
import { BookOpen, UserRound, Users } from "lucide-react"
import { deleteAuthor, listAuthors } from "../api/catalog.js"
import { RowActions } from "../components/RowActions.jsx"
import { CatalogListPage } from "./CatalogListPage.jsx"
import { usePagedCatalog } from "./usePagedCatalog.js"

function loadAuthors(criteria) {
  return listAuthors({
    q: criteria.query,
    page: criteria.page,
    pageSize: criteria.pageSize,
    sort: criteria.sort,
  })
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
}

function figure(stats, key) {
  if (!stats) return "…"
  return Number(stats[key] || 0).toLocaleString("fr-FR")
}

export function AuthorsPage() {
  const { data, error, onPageRequest, reload } = usePagedCatalog(loadAuthors)
  const [actionError, setActionError] = useState("")
  const rows = data?.results || []
  const stats = data?.stats

  async function onRemove(row) {
    if (!window.confirm(`Supprimer « ${row.name} » ?`)) return
    const result = await deleteAuthor(row.id)
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
        heading="Liste des auteurs"
        one="auteur"
        noun="auteurs"
        addLabel="Ajouter un auteur"
        addTo="/catalogue/auteurs/nouveau"
        placeholder="Rechercher un auteur (nom, prénom…)"
        rows={rows}
        loading={!data && !error}
        onPageRequest={onPageRequest}
        totalCount={data?.count || 0}
        pageCount={data?.pages || 1}
        searchOf={(row) => row.name}
        sortOf={(row) => row.name}
        stats={[
          { label: "Auteurs", value: figure(stats, "total"), trend: "dans le catalogue", icon: Users, chip: "bg-lavender text-violet" },
          { label: "Auteurs avec des livres", value: figure(stats, "with_books"), trend: "liés à une fiche", icon: UserRound, chip: "bg-available-soft text-available" },
          { label: "Auteurs sans livre", value: figure(stats, "without_books"), trend: "fiche seule", icon: UserRound, chip: "bg-unavailable-soft text-unavailable" },
          { label: "Livres liés", value: figure(stats, "linked"), trend: "au total", icon: BookOpen, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
        ]}
        oneLine
        filters={[]}
        columns={[
          { key: "n", label: "#", render: (_row, index) => index + 1 },
          {
            key: "photo",
            label: "Photo",
            render: (row) => row.photo
              ? <img src={row.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
              : <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-lavender font-semibold text-violet">{initials(row.name)}</span>,
          },
          { key: "name", label: "Nom et prénom", render: (row) => <span className="font-semibold text-heading">{row.name}</span> },
          { key: "biography", label: "Biographie", render: (row) => row.biography || "—" },
          { key: "books", label: "Livres", render: (row) => row.books },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <RowActions
                viewTo={`/catalogue/auteurs/${row.id}`}
                editTo={`/catalogue/auteurs/${row.id}/modifier`}
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
