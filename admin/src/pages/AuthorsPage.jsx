import { useEffect, useState } from "react"
import { BookOpen, UserRound, Users } from "lucide-react"
import { deleteAuthor, listAuthors } from "../api/catalog.js"
import { RowActions } from "../components/RowActions.jsx"
import { CatalogListPage } from "./CatalogListPage.jsx"

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
}

export function AuthorsPage() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    listAuthors().then((result) => {
      if (!result.ok) setError(result.error)
      else setRows(result.data)
    })
  }, [])

  async function onRemove(row) {
    if (!window.confirm(`Supprimer « ${row.name} » ?`)) return
    const result = await deleteAuthor(row.id)
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
      heading="Liste des auteurs"
      one="auteur"
      noun="auteurs"
      addLabel="Ajouter un auteur"
      addTo="/catalogue/auteurs/nouveau"
      placeholder="Rechercher un auteur (nom, prénom…)"
      rows={rows}
      searchOf={(row) => `${row.name} ${row.biography}`}
      sortOf={(row) => row.name}
      stats={[
        { label: "Auteurs", value: String(rows.length), trend: "dans le catalogue", icon: Users, chip: "bg-lavender text-violet" },
        { label: "Auteurs avec des livres", value: String(withBooks), trend: "liés à une fiche", icon: UserRound, chip: "bg-available-soft text-available" },
        { label: "Auteurs sans livre", value: String(rows.length - withBooks), trend: "fiche seule", icon: UserRound, chip: "bg-unavailable-soft text-unavailable" },
        { label: "Livres liés", value: String(rows.reduce((sum, row) => sum + row.books, 0)), trend: "au total", icon: BookOpen, chip: "bg-[#e7eefc] text-[#1d4ed8]" },
      ]}
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
  )
}
